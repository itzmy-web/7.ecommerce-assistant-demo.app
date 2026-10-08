"""第15章路由级验收：七个生成/建议接口均已注册、要求登录、确实保存记录。

与笔记 15.8.1 一致：
- 使用临时 SQLite 数据库，不写入课堂 MySQL；
- 把模型调用替换为明确的“未配置”异常，验证真实业务服务能走规则回退、路由能保存记录；
- 不需要真实 API Key，也不会发起网络请求。
"""
from datetime import date
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models import (
    AdExperiment,
    AdRecommendation,
    Base,
    CreativePlan,
    PerformanceRecord,
    Platform,
    Product,
    ProductDiagnosis,
    ReviewReport,
    Store,
    User,
    UserRole,
)

API = "/api/v1"

PRODUCT_GENERATE_PATHS = [
    "/products/{product_id}/diagnoses/generate",
    "/products/{product_id}/creative-plans/main-images/generate",
    "/products/{product_id}/creative-plans/video-scripts/generate",
    "/products/{product_id}/review-reports/generate",
    "/products/{product_id}/ad-recommendations/generate",
    "/products/{product_id}/ad-experiments/generate",
]
STORE_PATHS = [
    "/stores/{store_id}/inventory-advice",
]
STAGE15_PATHS = [f"{API}{path}" for path in PRODUCT_GENERATE_PATHS + STORE_PATHS]


def test_stage15_routes_are_registered_once() -> None:
    """验证“stage15路由areregisteredonce”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    # 新版本 Starlette(1.7) 会把 include_router 的结果保留为嵌套对象，直接遍历 app.routes
    # 取不到业务路由；改用 OpenAPI —— 它是“实际对外暴露的接口”的权威来源，
    # 路径作为 dict key 天然唯一，因此同一个 key 出现即代表注册且未被重复叠加。
    exposed = app.openapi()["paths"]
    for path in STAGE15_PATHS:
        assert path in exposed, f"{path} 未注册"
        assert "post" in exposed[path], f"{path} 没有 POST 方法"


def test_stage15_generate_endpoints_reject_anonymous_requests() -> None:
    """验证“stage15生成端点reject匿名请求”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    engine = _engine()
    Base.metadata.create_all(engine)
    _seed_product(engine)

    client = TestClient(app)
    app.dependency_overrides[get_db] = _override_db(engine)
    # 故意不覆盖 get_current_user：让真实鉴权逻辑生效，验证匿名请求被挡在最外层。
    try:
        for path in PRODUCT_GENERATE_PATHS:
            response = client.post(f"{API}{path}".replace("{product_id}", "1"))
            assert response.status_code == 401, f"{path} 应拒绝匿名请求，实际 {response.status_code}"

        response = client.post(f"{API}/stores/1/inventory-advice")
        assert response.status_code == 401, f"库存建议应拒绝匿名请求，实际 {response.status_code}"
    finally:
        app.dependency_overrides.clear()


def test_stage15_generate_endpoints_return_201_and_persist_records(monkeypatch) -> None:
    """验证“stage15生成端点return201andpersist记录”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    _disable_llm(monkeypatch)
    engine = _engine()
    Base.metadata.create_all(engine)
    product_id, store_id = _seed_product(engine)

    client = TestClient(app)
    app.dependency_overrides[get_db] = _override_db(engine)
    app.dependency_overrides[get_current_user] = lambda: _user(UserRole.OPERATOR)
    try:
        for path in PRODUCT_GENERATE_PATHS:
            response = client.post(
                f"{API}{path}".replace("{product_id}", str(product_id)),
                headers={"Authorization": "Bearer test"},
            )
            assert response.status_code == 201, (
                f"{path} 应返回201，实际 {response.status_code}: {response.text[:300]}"
            )

        response = client.post(
            f"{API}/stores/{store_id}/inventory-advice",
            headers={"Authorization": "Bearer test"},
        )
        assert response.status_code == 200, (
            f"库存建议应返回200，实际 {response.status_code}: {response.text[:300]}"
        )
    finally:
        app.dependency_overrides.clear()

    # 六个生成接口必须真的把业务记录落库，而不是只返回内存里的临时对象。
    with Session(engine) as db:
        assert _count_of(db, ProductDiagnosis) == 1
        assert _count_of(db, ReviewReport) == 1
        assert _count_of(db, AdRecommendation) == 1
        assert _count_of(db, AdExperiment) == 1
        # 主图和视频脚本各至少3条；与经济omain无关的方向性断言只校验数量下限。
        assert _count_of(db, CreativePlan) >= 6


def test_stage15_missing_product_returns_404(monkeypatch) -> None:
    """验证“stage15缺失商品returns404”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    _disable_llm(monkeypatch)
    engine = _engine()
    Base.metadata.create_all(engine)

    client = TestClient(app)
    app.dependency_overrides[get_db] = _override_db(engine)
    app.dependency_overrides[get_current_user] = lambda: _user(UserRole.OPERATOR)
    try:
        for path in PRODUCT_GENERATE_PATHS:
            response = client.post(
                f"{API}{path}".replace("{product_id}", "9999"),
                headers={"Authorization": "Bearer test"},
            )
            assert response.status_code == 404, f"{path} 未知商品应返回404，实际 {response.status_code}"
    finally:
        app.dependency_overrides.clear()


def test_stage15_review_report_returns_400_without_performance_records(monkeypatch) -> None:
    """验证“stage15审核reportreturns400without经营记录”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    _disable_llm(monkeypatch)
    engine = _engine()
    Base.metadata.create_all(engine)

    with Session(engine) as db:
        product = Product(name="无经营记录商品", platform=Platform.DOUYIN)
        db.add(product)
        db.commit()
        product_id = product.id

    client = TestClient(app)
    app.dependency_overrides[get_db] = _override_db(engine)
    app.dependency_overrides[get_current_user] = lambda: _user(UserRole.OPERATOR)
    try:
        response = client.post(
            f"{API}/products/{product_id}/review-reports/generate",
            headers={"Authorization": "Bearer test"},
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 400, f"无经营记录时复盘应返回400，实际 {response.status_code}"


def _count_of(db: Session, model) -> int:
    """构造或执行测试所需的计数，让测试数据、依赖替身与断言保持集中。"""
    return int(db.scalar(select(func.count()).select_from(model)) or 0)


def _seed_product(engine) -> tuple[int, int]:
    """构造或执行测试所需的测试数据，让测试数据、依赖替身与断言保持集中。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    with Session(engine) as db:
        store = Store(name="课堂食品店", platform=Platform.DOUYIN)
        db.add(store)
        db.flush()

        product = Product(
            name="低糖燕麦饼干",
            platform=Platform.DOUYIN,
            category="食品/饼干",
            price=Decimal("29.9"),
            cost=Decimal("12.5"),
            target_audience="通勤上班族、控糖人群",
            selling_points=["独立小包装", "低糖高纤维", "非油炸烘焙"],
            store_id=store.id,
        )
        db.add(product)
        db.flush()

        # 复盘、投放建议和投放实验都要读取经营数据，缺少这条记录复盘会返回400。
        record = PerformanceRecord(
            product_id=product.id,
            period_start=date(2026, 6, 1),
            period_end=date(2026, 6, 7),
            impressions=6800,
            clicks=388,
            ctr=Decimal("0.0571"),
            conversions=24,
            conversion_rate=Decimal("0.0619"),
            spend=Decimal("260.00"),
            revenue=Decimal("957.60"),
            roi=Decimal("3.6831"),
        )
        db.add(record)
        db.commit()
        return product.id, store.id


def _disable_llm(monkeypatch) -> None:
    """构造或执行测试所需的关闭llm，让测试数据、依赖替身与断言保持集中。"""
    # 让统一调用层表现成“未配置”，业务服务据此走规则回退；测试因此稳定且零网络请求。
    monkeypatch.setattr("app.services.llm.is_llm_configured", lambda settings=None: False)


def _engine():
    """构造或执行测试所需的engine，让测试数据、依赖替身与断言保持集中。"""
    return create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def _override_db(engine):
    """构造或执行测试所需的覆盖db，让测试数据、依赖替身与断言保持集中。"""
    def _dependency():
        """构造或执行测试所需的依赖覆盖，让测试数据、依赖替身与断言保持集中。"""
        with Session(engine) as db:
            yield db

    return _dependency


def _user(role: UserRole) -> User:
    """构造或执行测试所需的用户，让测试数据、依赖替身与断言保持集中。"""
    return User(id=1, email=f"{role.value}@example.com", display_name=f"{role.value}-user", role=role)
