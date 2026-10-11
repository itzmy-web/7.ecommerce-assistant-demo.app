"""店铺级授权 + 注册表实现分派 + SSE 事件流测试。"""

import json

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.agents.registry import WORKFLOW_REGISTRY, get_workflow
from app.api.routes.auth import get_current_user
from app.db.session import get_db
from app.main import app
from app.models import (
    AgentRun,
    AgentRunEvent,
    AgentRunStatus,
    Base,
    Store,
    User,
    UserRole,
    Workspace,
    WorkspaceMembership,
)


def _make_engine():
    return create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )


def _seed_base(db: Session) -> None:
    db.add(Workspace(id=1, slug="demo", name="演示工作台", status="active", settings={}))
    db.add(User(id=1, email="owner@example.com", display_name="Owner", role=UserRole.OWNER))
    db.add(User(id=2, email="op@example.com", display_name="运营 A", role=UserRole.OPERATOR))
    db.add(User(id=3, email="op2@example.com", display_name="运营 B", role=UserRole.OPERATOR))
    for uid in (1, 2, 3):
        db.add(WorkspaceMembership(workspace_id=1, user_id=uid, role=UserRole.OWNER if uid == 1 else UserRole.OPERATOR))
    db.add(Store(id=1, workspace_id=1, name="店铺一", platform="tmall", status="active"))
    db.add(Store(id=2, workspace_id=1, name="店铺二", platform="jd", status="active"))
    db.commit()


def _client_for(engine, user_id: int):
    def override_db():
        with Session(engine) as db:
            yield db

    def override_user():
        with Session(engine) as db:
            return db.get(User, user_id)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user
    gen = _gen_guard()
    return TestClient(app), gen


def _gen_guard():
    yield None


# ────────────── #5 店铺级授权 ──────────────


def _seed_grants(engine, store_id: int, user_id: int) -> None:
    from app.models import StoreGrant

    with Session(engine) as db:
        db.add(StoreGrant(store_id=store_id, user_id=user_id, role="viewer"))
        db.commit()


def test_granular_mode_hides_ungranted_stores_from_operator():
    """细粒度激活后：operator 只能看到被授予的店铺；owner 全可见。"""
    engine = _make_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_base(db)
        _seed_grants(engine, store_id=1, user_id=2)

    # owner 不受限
    client, _g = _client_for(engine, 1)
    resp = client.get("/api/v1/stores")
    assert [s["id"] for s in resp.json()] == [1, 2]

    # operator B 未被授权：只能看到空列表
    client3, _g3 = _client_for(engine, 3)
    resp = client3.get("/api/v1/stores")
    assert resp.json() == []

    # operator A 被授予店铺一：只见店铺一
    client2, _g2 = _client_for(engine, 2)
    resp = client2.get("/api/v1/stores")
    assert [s["id"] for s in resp.json()] == [1]

    # 直接访问未授权店铺：403
    resp = client2.get("/api/v1/stores/2")
    assert resp.status_code == 403
    # 被授权店铺：200
    resp = client2.get("/api/v1/stores/1")
    assert resp.status_code == 200


def test_no_grants_keeps_backward_compatible_visibility():
    """细粒度未激活：operator 仍可见全部店铺（向后兼容，无行为突变）。"""
    engine = _make_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_base(db)

    client, _g = _client_for(engine, 2)
    resp = client.get("/api/v1/stores")
    assert [s["id"] for s in resp.json()] == [1, 2]


def test_grant_management_lifecycle():
    """owner 管理 grant：upsert → 列表 → 撤销；角色不合法 422；用户不存在 404。"""
    engine = _make_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_base(db)

    client, _g = _client_for(engine, 1)
    resp = client.put(
        "/api/v1/stores/1/grants", json={"user_email": "op@example.com", "role": "editor"}
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "editor"

    resp = client.get("/api/v1/stores/1/grants")
    assert len(resp.json()) == 1

    resp = client.put(
        "/api/v1/stores/1/grants", json={"user_email": "nobody@example.com", "role": "viewer"}
    )
    assert resp.status_code == 404
    resp = client.put(
        "/api/v1/stores/1/grants", json={"user_email": "op@example.com", "role": "owner"}
    )
    assert resp.status_code == 422

    resp = client.delete("/api/v1/stores/1/grants/2")
    assert resp.status_code == 204
    assert client.get("/api/v1/stores/1/grants").json() == []


# ────────────── #6 注册表实现分派 ──────────────


def test_registry_dispatch_uses_implementation_field():
    """旧版商品图不再是硬编码特例：注册表 implementation 字段驱动分派。"""
    legacy = get_workflow("product_diagnosis_optimization")
    assert legacy.implementation == "legacy_product_graph"
    # 别名同样解析到 legacy 实现
    assert get_workflow("product_operation").implementation == "legacy_product_graph"
    # 其余工作流默认 platform 通道
    platform_keys = [k for k, w in WORKFLOW_REGISTRY.items() if w.implementation == "platform"]
    assert len(platform_keys) >= 6


# ────────────── #7 SSE 事件流 ──────────────


def _seed_run_with_events(engine) -> int:
    with Session(engine) as db:
        run = AgentRun(
            id=501,
            thread_id="sse-501",
            workspace_id=1,
            product_id=None,
            requested_by_user_id=1,
            workflow_key="periodic_review",
            workflow_version="v1",
            attempt=1,
            status=AgentRunStatus.COMPLETED,
        )
        db.add(run)
        db.add(
            AgentRunEvent(
                run_id=501,
                event_type="agent_step_completed",
                agent_name="performance_review",
                status="succeeded",
                message="复盘完成",
            )
        )
        db.commit()
    return 501


def test_sse_stream_emits_events_then_done():
    """已完成 run：SSE 先吐存量事件，再发 done 终止。"""
    engine = _make_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_base(db)
        run_id = _seed_run_with_events(engine)

    client, _g = _client_for(engine, 1)
    with client.stream("GET", f"/api/v1/agent-runs/{run_id}/events/stream") as resp:
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/event-stream")
        body = "".join(resp.iter_text())
    assert "event: agent_event" in body
    assert "复盘完成" in body
    assert "event: done" in body
    done_line = [line for line in body.splitlines() if line.startswith("data: {")][-1]
    assert json.loads(done_line.removeprefix("data: "))["status"] == "completed"


def test_sse_stream_rejects_unknown_run():
    engine = _make_engine()
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        _seed_base(db)
    client, _g = _client_for(engine, 1)
    resp = client.get("/api/v1/agent-runs/99999/events/stream")
    assert resp.status_code == 404
