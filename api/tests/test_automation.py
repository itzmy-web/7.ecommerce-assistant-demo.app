"""自动化任务中心聚合视图测试：空库返回零值 + 系统心跳清单可见。"""

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


def test_automation_overview_empty_database() -> None:
    """空库时：心跳清单可见，监控/任务/作业全部为空或零值，不报错。"""
    client, _gen = _make_client()
    resp = client.get("/api/v1/automation/overview")
    finally_clear(app)

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert [h["task"] for h in payload["system_heartbeats"]] == [
        "maintenance.dispatch_outbox",
        "maintenance.agent_runtime",
    ]
    assert payload["competitor_monitors"] == []
    assert payload["active_agent_tasks"] == []
    assert payload["generation_jobs_active"] == 0
    assert payload["agent_runs_queued"] == 0
    assert payload["agent_runs_running"] == 0


def finally_clear(a) -> None:
    a.dependency_overrides.clear()
