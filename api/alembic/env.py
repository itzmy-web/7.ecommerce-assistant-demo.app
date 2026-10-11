from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context
from app.core.config import get_settings
from app.db.base import Base

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


# ── MySQL 守卫：删索引/删表前先摘掉外键约束，避免 1553 / 3730 ──────────────
# 背景：MySQL 会为外键自动在被引用列上建支撑索引；autogenerate 或手写 downgrade
# 直接 DROP INDEX / DROP TABLE 会被 MySQL 拒绝（索引/表被外键占用）。
# 这里在 drop 前自动摘掉相关外键，专治这一类反向报错。仅在 MySQL 生效；
# 守卫自身任何异常都吞掉，绝不阻断原迁移操作（原 op 始终会执行）。
import alembic.operations.ops as _ops  # noqa: E402  # 故意中置：守卫补丁需在 metadata 建好后再挂
from sqlalchemy import Engine as _Engine  # noqa: E402
from sqlalchemy import text as _text  # noqa: E402


def _drop_fk_for_index(self, index_name, table_name):
    try:
        bind = self.get_bind()
        if bind is None or bind.dialect.name != "mysql":
            return
        conn = bind if not isinstance(bind, _Engine) else bind.connect()
        try:
            if table_name is None:
                row = conn.execute(_text(
                    "SELECT TABLE_NAME FROM information_schema.STATISTICS "
                    "WHERE INDEX_NAME=:n AND INDEX_SCHEMA=DATABASE() LIMIT 1"
                ), {"n": index_name}).first()
                if not row:
                    return
                table_name = row[0]
            cols = [r[0] for r in conn.execute(_text(
                "SELECT COLUMN_NAME FROM information_schema.STATISTICS "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND INDEX_NAME=:n "
                "ORDER BY SEQ_IN_INDEX"
            ), {"t": table_name, "n": index_name}).fetchall()]
            if not cols:
                return
            fks = conn.execute(_text(
                "SELECT CONSTRAINT_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE "
                "WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=:t AND REFERENCED_TABLE_NAME IS NOT NULL"
            ), {"t": table_name}).fetchall()
            for cname, col in fks:
                if col in cols:
                    conn.execute(_text(f"ALTER TABLE `{table_name}` DROP FOREIGN KEY `{cname}`"))
        finally:
            if isinstance(bind, _Engine):
                conn.close()
    except Exception:  # noqa: BLE001, S110  # 守卫故意吞异常，绝不阻断原迁移（见上方注释）
        pass


def _drop_fk_referencing(self, table_name):
    try:
        bind = self.get_bind()
        if bind is None or bind.dialect.name != "mysql":
            return
        conn = bind if not isinstance(bind, _Engine) else bind.connect()
        try:
            rows = conn.execute(_text(
                "SELECT TABLE_NAME, CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS "
                "WHERE CONSTRAINT_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME=:t"
            ), {"t": table_name}).fetchall()
            for child, cname in rows:
                conn.execute(_text(f"ALTER TABLE `{child}` DROP FOREIGN KEY `{cname}`"))
        finally:
            if isinstance(bind, _Engine):
                conn.close()
    except Exception:  # noqa: BLE001, S110  # 守卫故意吞异常，绝不阻断原迁移（见上方注释）
        pass


def _g_drop_index(self, index_name, table_name=None, **kw):
    _drop_fk_for_index(self, index_name, table_name)
    return _ops.Operations.drop_index(self, index_name, table_name=table_name, **kw)


def _g_drop_table(self, table_name, **kw):
    _drop_fk_referencing(self, table_name)
    return _ops.Operations.drop_table(self, table_name, **kw)


def _g_drop_constraint(self, *args, **kw):
    try:
        return _ops.Operations.drop_constraint(self, *args, **kw)
    except Exception as e:  # 已被守卫摘掉的约束再删会 1091，直接忽略
        if "1091" in str(e) or "doesn't exist" in str(e).lower():
            return None
        raise


_ops.Operations.drop_index = _g_drop_index
_ops.Operations.drop_table = _g_drop_table
_ops.Operations.drop_constraint = _g_drop_constraint


def get_url() -> str:
    """在数据库迁移中获取URL，并保持升级与回滚的依赖顺序可控。"""
    return get_settings().database_url


def run_migrations_offline() -> None:
    """在数据库迁移中执行migrationsoffline，并保持升级与回滚的依赖顺序可控。"""
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """在数据库迁移中执行migrationsonline，并保持升级与回滚的依赖顺序可控。"""
    # 迁移步骤按依赖顺序执行，保证升级或回滚不会留下悬空约束。
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()
    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
