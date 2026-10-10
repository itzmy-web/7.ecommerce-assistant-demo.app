"""数据看板路由：只读聚合端点，登录即可查看（无需编辑权限）。"""

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.routes.auth import require_view_permission
from app.db.session import get_db
from app.models import User
from app.schemas import (
    DashboardInventoryAlerts,
    DashboardOverview,
    DashboardPerformancePoint,
    DashboardPerformanceTrend,
)
from app.services import dashboard as dashboard_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
SessionDep = Annotated[Session, Depends(get_db)]
UserDep = Annotated[User, Depends(require_view_permission)]


@router.get("/overview", response_model=DashboardOverview)
def get_overview(db: SessionDep, _current_user: UserDep) -> DashboardOverview:
    """看板概览卡片：商品/SKU/库存告警/创意计划/待审批 + 近 30 天经营汇总。"""
    data = dashboard_service.get_overview(db)
    return DashboardOverview(**data)


@router.get("/performance-trend", response_model=DashboardPerformanceTrend)
def get_performance_trend(
    db: SessionDep,
    _current_user: UserDep,
    days: Annotated[int, Query(ge=7, le=90)] = 30,
) -> DashboardPerformanceTrend:
    """近 N 天 revenue / clicks / conversions 时间序列（按 period_start 聚合）。"""
    data = dashboard_service.get_performance_trend(db, days=days)
    return DashboardPerformanceTrend(
        days=data["days"],
        points=[
            DashboardPerformancePoint(
                period_start=point["period_start"],
                revenue=Decimal(point["revenue"]),
                clicks=point["clicks"],
                conversions=point["conversions"],
            )
            for point in data["points"]
        ],
    )


@router.get("/inventory-alerts", response_model=DashboardInventoryAlerts)
def get_inventory_alerts(
    db: SessionDep,
    _current_user: UserDep,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
) -> DashboardInventoryAlerts:
    """库存告警明细：可用量跌破阈值的 SKU，按缺口从大到小排序。"""
    data = dashboard_service.get_inventory_alerts(db, limit=limit)
    return DashboardInventoryAlerts(**data)
