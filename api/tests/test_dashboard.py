"""数据看板聚合端点测试：空库零值场景 + 造数聚合场景。"""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models import (
    AgentApproval,
    AgentApprovalStatus,
    AgentRiskLevel,
    AgentRun,
    AgentRunStatus,
    AgentTask,
    AgentTaskStatus,
    CreativePlan,
    CreativePlanStatus,
    CreativePlanType,
    InventoryItem,
    PerformanceRecord,
    Platform,
    Product,
    ProductSku,
    Store,
    User,
    UserRole,
    Workspace,
    WorkspaceMembership,
)


def _make_engine():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    return engine


def _override(client_setup: dict) -> None:
    app.dependency_overrides[get_db] = client_setup["override_db"]
    app.dependency_overrides[get_current_user] = lambda: client_setup["user"]


def test_dashboard_overview_empty_database_returns_zeroes() -> None:
    """空库时概览端点应返回全零/None，而不是报错。"""
    engine = _make_engine()
    from app.models import Base

    Base.metadata.create_all(engine)

    def override_db():
        with Session(engine) as db:
            yield db

    viewer = User(
        id=1,
        email="viewer@example.com",
        display_name="Viewer",
        role=UserRole.VIEWER,
    )
    setup = {"override_db": override_db, "user": viewer}
    try:
        _override(setup)
        response = TestClient(app).get("/api/v1/dashboard/overview")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["product_count"] == 0
    assert payload["active_sku_count"] == 0
    assert payload["inventory_alert_count"] == 0
    assert payload["active_creative_plan_count"] == 0
    assert payload["pending_approval_count"] == 0
    assert Decimal(payload["revenue_last_30d"]) == Decimal(0)
    assert payload["avg_roi_last_30d"] is None


def test_dashboard_overview_aggregates_seeded_metrics() -> None:
    """造数验证概览聚合口径：商品/SKU/告警/创意/待审批/近 30 天 revenue 与 roi。"""
    engine = _make_engine()
    from app.models import Base

    Base.metadata.create_all(engine)

    with Session(engine) as db:
        workspace = Workspace(slug="main", name="Main")
        owner = User(
            email="owner@example.com",
            display_name="Owner",
            role=UserRole.OWNER,
        )
        db.add_all([workspace, owner])
        db.flush()
        membership = WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=owner.id,
            role=UserRole.OWNER,
        )
        db.add(membership)

        store = Store(name="Douyin Shop", platform=Platform.DOUYIN, workspace_id=workspace.id)
        product = Product(
            name="精华液",
            platform=Platform.DOUYIN,
            store=store,
            workspace_id=workspace.id,
        )
        db.add_all([store, product])
        db.flush()

        # 两个 SKU：一个告警（可用 3 <= 阈值 5），一个正常。
        sku_alert = ProductSku(product=product, sku_code="SKU-A", name="50ml")
        sku_ok = ProductSku(product=product, sku_code="SKU-B", name="80ml")
        db.add_all([sku_alert, sku_ok])
        db.flush()
        db.add(
            InventoryItem(
                sku=sku_alert, quantity=5, locked_quantity=2, warning_threshold=5
            )
        )
        db.add(
            InventoryItem(
                sku=sku_ok, quantity=100, locked_quantity=0, warning_threshold=5
            )
        )

        # 创意计划：1 个 selected（计入进行中），1 个 archived（不计）。
        db.add(
            CreativePlan(
                product_id=product.id,
                type=CreativePlanType.MAIN_IMAGE,
                title="主图方案",
                status=CreativePlanStatus.SELECTED,
            )
        )
        db.add(
            CreativePlan(
                product_id=product.id,
                type=CreativePlanType.MAIN_IMAGE,
                title="旧方案",
                status=CreativePlanStatus.ARCHIVED,
            )
        )

        # 近 30 天绩效两条 + 30 天前一条（不落入汇总）。
        today = datetime.now(UTC).date()
        db.add_all(
            [
                PerformanceRecord(
                    product_id=product.id,
                    period_start=today - timedelta(days=1),
                    period_end=today - timedelta(days=1),
                    revenue=Decimal("1200.50"),
                    roi=Decimal("2.5"),
                ),
                PerformanceRecord(
                    product_id=product.id,
                    period_start=today - timedelta(days=3),
                    period_end=today - timedelta(days=3),
                    revenue=Decimal("799.50"),
                    roi=Decimal("1.5"),
                ),
                PerformanceRecord(
                    product_id=product.id,
                    period_start=today - timedelta(days=40),
                    period_end=today - timedelta(days=40),
                    revenue=Decimal("99999.00"),
                    roi=Decimal(99),
                ),
            ]
        )

        # 待审批链路：task -> run -> approval(pending)。
        task = AgentTask(
            workspace_id=workspace.id,
            requested_by_user_id=owner.id,
            workflow_key="product_operation",
            workflow_version="v1",
            title="单品运营",
            status=AgentTaskStatus.AWAITING_APPROVAL,
        )
        db.add(task)
        db.flush()
        run = AgentRun(
            thread_id="thread-dashboard-1",
            workspace_id=workspace.id,
            task_id=task.id,
            requested_by_user_id=owner.id,
            workflow_key="product_operation",
            workflow_version="v1",
            status=AgentRunStatus.AWAITING_REVIEW,
        )
        db.add(run)
        db.flush()
        db.add(
            AgentApproval(
                workspace_id=workspace.id,
                task_id=task.id,
                run_id=run.id,
                requested_by_user_id=owner.id,
                action_key="publish_content",
                risk_level=AgentRiskLevel.R1,
                status=AgentApprovalStatus.PENDING,
            )
        )
        db.commit()
        owner_id = owner.id
        product_id = product.id

    def override_db():
        with Session(engine) as db:
            yield db

    # 当前用户用持久化的 workspace 成员（owner），让认证依赖能解析出工作区上下文。
    current_user = User(
        id=owner_id,
        email="owner@example.com",
        display_name="Owner",
        role=UserRole.OWNER,
    )
    setup = {"override_db": override_db, "user": current_user}
    try:
        _override(setup)
        client = TestClient(app)
        overview = client.get("/api/v1/dashboard/overview")
        trend = client.get("/api/v1/dashboard/performance-trend?days=30")
        alerts = client.get("/api/v1/dashboard/inventory-alerts")
    finally:
        app.dependency_overrides.clear()

    assert overview.status_code == 200
    payload = overview.json()
    assert payload["product_count"] == 1
    assert payload["active_sku_count"] == 2
    assert payload["inventory_alert_count"] == 1
    assert payload["active_creative_plan_count"] == 1
    assert payload["pending_approval_count"] == 1
    assert Decimal(payload["revenue_last_30d"]) == Decimal("2000.00")
    assert Decimal(payload["avg_roi_last_30d"]) == Decimal("2.0")

    assert trend.status_code == 200
    trend_payload = trend.json()
    assert trend_payload["days"] == 30
    assert len(trend_payload["points"]) == 2
    by_day = {point["period_start"]: point for point in trend_payload["points"]}
    assert set(by_day) == {
        (datetime.now(UTC).date() - timedelta(days=1)).isoformat(),
        (datetime.now(UTC).date() - timedelta(days=3)).isoformat(),
    }

    assert alerts.status_code == 200
    alert_payload = alerts.json()
    assert alert_payload["total"] == 1
    row = alert_payload["rows"][0]
    assert row["sku_code"] == "SKU-A"
    assert row["available_quantity"] == 3
    assert row["warning_threshold"] == 5
    assert row["product_id"] == product_id
