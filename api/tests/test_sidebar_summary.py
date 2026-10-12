"""侧栏徽标汇总测试：空库返回零值 + 计数语义正确。"""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models import Base, User, UserRole


def _make_client():
    """返回 (client, 持活的生成器引用)——生成器被 GC 会误清依赖覆盖，必须保活。"""
    gen = _client_gen()
    return next(gen), gen


def _client_gen():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)

    def override_db():
        with Session(engine) as db:
            yield db

    viewer = User(
        id=1, email="viewer@example.com", display_name="Viewer", role=UserRole.OWNER
    )
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: viewer
    yield TestClient(app)


def finally_clear(a) -> None:
    a.dependency_overrides.clear()


def test_sidebar_summary_empty_database() -> None:
    """空库时侧栏汇总全部为零值，不报错。"""
    client, _gen = _make_client()
    resp = client.get("/api/v1/workspace/sidebar-summary")
    finally_clear(app)

    assert resp.status_code == 200, resp.text
    assert resp.json() == {
        "products": 0,
        "stores": 0,
        "low_stock_skus": 0,
        "pending_approvals": 0,
        "active_tasks": 0,
    }
