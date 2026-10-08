"""align schema with models

Revision ID: eb096fcef5d3
Revises: f4a9c2e7d1b6
Create Date: 2026-10-04 00:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import mysql

from alembic import op

revision: str = "eb096fcef5d3"
down_revision: str | None = "f4a9c2e7d1b6"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


# 早期迁移建表时把一批 JSON 字段留成了允许 NULL，与模型声明不一致：
# 模型侧把它们当作非空（业务上「结构化的内容」不该缺），
# 而插入 None 会让下游解析拿不到可依赖的形状。
# 反过来 products / stores / agent_runs 的 workspace_id 在库里是 NOT NULL，
# 模型侧却声明可空，与「一个 workspace 就是一次全部数据的边界」的约定相悖。
NULLABLE_TO_NOT_NULL = (
    ("ad_recommendations", "content"),
    ("competitor_monitor_snapshots", "selling_points"),
    ("competitor_monitor_snapshots", "changes"),
    ("competitor_monitor_snapshots", "raw_payload"),
    ("generated_assets", "tags"),
    ("generated_assets", "metadata"),
    ("generation_job_events", "payload"),
    ("generation_jobs", "result"),
    ("platform_accounts", "auth_metadata"),
    ("platform_product_mappings", "raw_payload"),
    ("product_skus", "attributes"),
    ("public_link_parse_tasks", "result"),
)

NULLABLE_TO_ALLOW_NULL = (
    ("agent_runs", "workspace_id"),
    ("products", "workspace_id"),
    ("stores", "workspace_id"),
)


def upgrade() -> None:
    """补齐历史迁移漏掉的列约束，让库结构与模型声明一致。"""
    # 迁移步骤按依赖顺序执行，保证升级或回滚不会留下悬空约束。
    for table, column in NULLABLE_TO_NOT_NULL:
        op.alter_column(
            table,
            column,
            existing_type=mysql.JSON(),
            nullable=False,
        )
    for table, column in NULLABLE_TO_ALLOW_NULL:
        op.alter_column(
            table,
            column,
            existing_type=mysql.INTEGER(),
            nullable=True,
        )
    # Platform 枚举模型里含 jd（京东），早期建表迁移漏了这一项，
    # 不补上则写京东平台数据会在数据库层直接被拒。
    platform_enum = sa.Enum(
        "douyin",
        "taobao",
        "tmall",
        "pinduoduo",
        "jd",
        "tiktok_shop",
        "amazon",
        "other",
        name="platform",
    )
    for table in ("competitors", "products"):
        op.alter_column(
            table,
            "platform",
            existing_type=mysql.ENUM(
                "douyin",
                "taobao",
                "tmall",
                "pinduoduo",
                "tiktok_shop",
                "amazon",
                "other",
            ),
            type_=platform_enum,
            existing_nullable=False,
        )


def downgrade() -> None:
    """把列约束还原回历史迁移建表时的状态。"""
    # 迁移步骤按依赖顺序执行，保证升级或回滚不会留下悬空约束。
    for table, column in NULLABLE_TO_NOT_NULL:
        op.alter_column(
            table,
            column,
            existing_type=mysql.JSON(),
            nullable=True,
        )
    for table, column in NULLABLE_TO_ALLOW_NULL:
        op.alter_column(
            table,
            column,
            existing_type=mysql.INTEGER(),
            nullable=False,
        )
    platform_enum = sa.Enum(
        "douyin",
        "taobao",
        "tmall",
        "pinduoduo",
        "jd",
        "tiktok_shop",
        "amazon",
        "other",
        name="platform",
    )
    legacy_enum = mysql.ENUM(
        "douyin",
        "taobao",
        "tmall",
        "pinduoduo",
        "tiktok_shop",
        "amazon",
        "other",
    )
    for table in ("competitors", "products"):
        op.alter_column(
            table,
            "platform",
            existing_type=platform_enum,
            type_=legacy_enum,
            existing_nullable=False,
        )
