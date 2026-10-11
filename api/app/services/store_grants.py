"""店铺级授权：渐进收紧的可见性过滤与授权管理。

语义：
- owner / can_manage_users 用户不受限，始终可见工作台全部店铺。
- 一旦工作台内任意店铺存在 grant 记录（"细粒度模式"激活），
  普通成员只能看到被授予的店铺；未激活时保持旧的"全员可见"行为，
  避免对现有部署造成行为突变。
- 授权管理入口仅对 owner / can_manage_users 开放。
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Store, StoreGrant, User, UserRole
from app.services.users import user_permissions

GRANT_ROLES = ("viewer", "editor")


def _is_privileged(user: User) -> bool:
    """owner 或用户管理员不做店铺级限制。"""
    return user.role == UserRole.OWNER or bool(user_permissions(user)["can_manage_users"])


def visible_store_ids(db: Session, user: User, workspace_id: int | None) -> set[int] | None:
    """返回用户可见的店铺 id 集合；None 表示不受限（全部可见）。"""
    if _is_privileged(user):
        return None

    statement = select(Store.id).where(Store.workspace_id.isnot(None))
    if workspace_id is not None:
        statement = statement.where(Store.workspace_id == workspace_id)
    workspace_store_ids = set(db.scalars(statement).all())
    if not workspace_store_ids:
        return None

    granular_ids = set(
        db.scalars(select(StoreGrant.store_id).where(StoreGrant.store_id.in_(workspace_store_ids))).all()
    )
    # 细粒度模式未激活：保持全员可见，行为向后兼容。
    if not granular_ids:
        return None

    granted_ids = set(
        db.scalars(
            select(StoreGrant.store_id).where(
                StoreGrant.store_id.in_(granular_ids), StoreGrant.user_id == user.id
            )
        ).all()
    )
    return granted_ids


def assert_store_visible(db: Session, user: User, workspace_id: int | None, store_id: int) -> None:
    """店铺可见性断言；不可见时抛 PermissionError，由路由层转 403。"""
    allowed = visible_store_ids(db, user, workspace_id)
    if allowed is not None and store_id not in allowed:
        raise PermissionError("无权访问该店铺")


def list_grants(db: Session, store_id: int) -> list[dict]:
    """列出店铺的全部授权（含用户信息，供管理界面展示）。"""
    rows = db.scalars(select(StoreGrant).where(StoreGrant.store_id == store_id)).all()
    result = []
    for grant in rows:
        user = db.get(User, grant.user_id)
        result.append(
            {
                "id": grant.id,
                "user_id": grant.user_id,
                "user_email": user.email if user else f"user#{grant.user_id}",
                "user_display_name": user.display_name if user else "",
                "role": grant.role,
                "created_at": grant.created_at.isoformat() if grant.created_at else None,
            }
        )
    return result


def upsert_grant(db: Session, store_id: int, user_email: str, role: str) -> dict:
    """按邮箱 upsert 授权；用户不存在抛 LookupError，角色不合法抛 ValueError。"""
    if role not in GRANT_ROLES:
        raise ValueError(f"角色只能是：{' / '.join(GRANT_ROLES)}")
    user = db.scalars(select(User).where(User.email == user_email.strip().lower())).first()
    if user is None:
        raise LookupError("用户不存在，请先在「设置-成员管理」中创建账号")

    grant = db.scalars(
        select(StoreGrant).where(StoreGrant.store_id == store_id, StoreGrant.user_id == user.id)
    ).first()
    if grant is None:
        grant = StoreGrant(store_id=store_id, user_id=user.id, role=role)
        db.add(grant)
    else:
        grant.role = role
    db.commit()
    db.refresh(grant)
    return {
        "id": grant.id,
        "user_id": grant.user_id,
        "user_email": user.email,
        "user_display_name": user.display_name,
        "role": grant.role,
        "created_at": grant.created_at.isoformat() if grant.created_at else None,
    }


def revoke_grant(db: Session, store_id: int, user_id: int) -> bool:
    """撤销授权；返回是否真的删除了一条。"""
    grant = db.scalars(
        select(StoreGrant).where(StoreGrant.store_id == store_id, StoreGrant.user_id == user_id)
    ).first()
    if grant is None:
        return False
    db.delete(grant)
    db.commit()
    return True
