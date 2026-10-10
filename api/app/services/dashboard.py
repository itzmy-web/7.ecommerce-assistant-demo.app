"""数据看板聚合服务：只读查询，按 Workspace 隔离，route 不堆 SQL。

口径约定：
- "库存告警"= available_quantity <= warning_threshold（可用量 = quantity - locked_quantity），
  与店铺库存汇总页的 is_low_stock 判定保持一致；
- "进行中创意计划"= status 为 draft / selected 的创意方案（archived 视为已归档）；
- "待审批"= AgentApproval 状态为 pending 的记录数；
- 近 30 天经营汇总基于 performance_records.period_start >= 今天 - 30 天，
  revenue 取求和、roi 取有值记录的算术平均（缺 spend 权重，仅作参考）。

Workspace 隔离沿用全站约定：db.info["workspace_id"] 由认证依赖注入，
None 表示无工作区上下文（管理员视角），此时不做过滤。
"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    AgentApproval,
    AgentApprovalStatus,
    CreativePlan,
    CreativePlanStatus,
    InventoryItem,
    PerformanceRecord,
    Product,
    ProductSku,
    ProductSkuStatus,
)


def _workspace_id(db: Session) -> int | None:
    """读取认证依赖注入的工作区上下文；没有注入时返回 None（不过滤）。"""
    return db.info.get("workspace_id")


def get_overview(db: Session) -> dict:
    """汇总看板顶部六张卡片所需指标。"""
    workspace_id = _workspace_id(db)
    today = datetime.now(UTC).date()
    cutoff = today - timedelta(days=30)

    product_count = db.scalar(
        select(func.count(Product.id)).where(
            *(
                [Product.workspace_id == workspace_id]
                if workspace_id is not None
                else []
            )
        )
    ) or 0

    active_sku_count = db.scalar(
        select(func.count(ProductSku.id))
        .join(Product, ProductSku.product_id == Product.id)
        .where(ProductSku.status == ProductSkuStatus.ACTIVE)
        .where(*([Product.workspace_id == workspace_id] if workspace_id is not None else []))
    ) or 0

    # 库存告警：可用量（quantity - locked）跌破阈值的 SKU 数。
    inventory_alert_count = db.scalar(
        select(func.count(InventoryItem.id))
        .join(ProductSku, InventoryItem.sku_id == ProductSku.id)
        .join(Product, ProductSku.product_id == Product.id)
        .where(
            InventoryItem.quantity - InventoryItem.locked_quantity
            <= InventoryItem.warning_threshold,
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
    ) or 0

    active_creative_plan_count = db.scalar(
        select(func.count(CreativePlan.id))
        .join(Product, CreativePlan.product_id == Product.id)
        .where(
            CreativePlan.status.in_([CreativePlanStatus.DRAFT, CreativePlanStatus.SELECTED]),
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
    ) or 0

    pending_approval_count = db.scalar(
        select(func.count(AgentApproval.id)).where(
            AgentApproval.status == AgentApprovalStatus.PENDING,
            *(
                [AgentApproval.workspace_id == workspace_id]
                if workspace_id is not None
                else []
            ),
        )
    ) or 0

    revenue_last_30d = db.scalar(
        select(func.coalesce(func.sum(PerformanceRecord.revenue), 0))
        .join(Product, PerformanceRecord.product_id == Product.id)
        .where(
            PerformanceRecord.period_start >= cutoff,
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
    ) or 0

    avg_roi_last_30d = db.scalar(
        select(func.avg(PerformanceRecord.roi))
        .join(Product, PerformanceRecord.product_id == Product.id)
        .where(
            PerformanceRecord.period_start >= cutoff,
            PerformanceRecord.roi.is_not(None),
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
    )

    return {
        "product_count": product_count,
        "active_sku_count": active_sku_count,
        "inventory_alert_count": inventory_alert_count,
        "active_creative_plan_count": active_creative_plan_count,
        "pending_approval_count": pending_approval_count,
        "revenue_last_30d": Decimal(revenue_last_30d),
        "avg_roi_last_30d": (
            Decimal(avg_roi_last_30d) if avg_roi_last_30d is not None else None
        ),
    }


def get_performance_trend(db: Session, days: int = 30) -> dict:
    """按 period_start 聚合近 N 天的 revenue / clicks / conversions 时间序列。"""
    workspace_id = _workspace_id(db)
    cutoff = datetime.now(UTC).date() - timedelta(days=days)

    revenue_rows = db.execute(
        select(
            PerformanceRecord.period_start,
            func.coalesce(func.sum(PerformanceRecord.revenue), 0),
        )
        .join(Product, PerformanceRecord.product_id == Product.id)
        .where(
            PerformanceRecord.period_start >= cutoff,
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
        .group_by(PerformanceRecord.period_start)
        .order_by(PerformanceRecord.period_start)
    ).all()

    engagement_rows = db.execute(
        select(
            PerformanceRecord.period_start,
            func.coalesce(func.sum(PerformanceRecord.clicks), 0),
            func.coalesce(func.sum(PerformanceRecord.conversions), 0),
        )
        .join(Product, PerformanceRecord.product_id == Product.id)
        .where(
            PerformanceRecord.period_start >= cutoff,
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
        .group_by(PerformanceRecord.period_start)
        .order_by(PerformanceRecord.period_start)
    ).all()

    revenue_by_day = {row[0]: Decimal(row[1]) for row in revenue_rows}
    engagement_by_day = {row[0]: (int(row[1]), int(row[2])) for row in engagement_rows}

    all_days = sorted(set(revenue_by_day) | set(engagement_by_day))
    points = [
        {
            "period_start": day,
            "revenue": revenue_by_day.get(day, Decimal(0)),
            "clicks": engagement_by_day.get(day, (0, 0))[0],
            "conversions": engagement_by_day.get(day, (0, 0))[1],
        }
        for day in all_days
    ]
    return {"days": days, "points": points}


def get_inventory_alerts(db: Session, limit: int = 50) -> dict:
    """返回可用量跌破阈值的 SKU 明细，按缺口（阈值 - 可用量）从大到小排序。"""
    workspace_id = _workspace_id(db)
    statement = (
        select(InventoryItem, ProductSku, Product)
        .join(ProductSku, InventoryItem.sku_id == ProductSku.id)
        .join(Product, ProductSku.product_id == Product.id)
        .where(
            InventoryItem.quantity - InventoryItem.locked_quantity
            <= InventoryItem.warning_threshold,
            *([Product.workspace_id == workspace_id] if workspace_id is not None else []),
        )
        .order_by(
            (InventoryItem.warning_threshold - InventoryItem.quantity).desc(),
            ProductSku.sku_code,
        )
        .limit(limit)
    )
    rows = []
    for item, sku, product in db.execute(statement).all():
        rows.append(
            {
                "product_id": product.id,
                "product_name": product.name,
                "sku_id": sku.id,
                "sku_code": sku.sku_code,
                "sku_name": sku.name,
                "quantity": item.quantity,
                "locked_quantity": item.locked_quantity,
                "available_quantity": item.quantity - item.locked_quantity,
                "warning_threshold": item.warning_threshold,
            }
        )
    return {"total": len(rows), "rows": rows}
