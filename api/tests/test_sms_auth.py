"""短信验证码登录测试：发送（console 通道回带 debug_code）→ 登录 → 重复登录不重复建号。"""

from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.session import get_db
from app.main import app
from app.models import Base, User, UserRole, Workspace, WorkspaceMembership
from app.services import sms as sms_service


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

    with Session(engine) as db:
        db.add(
            Workspace(id=1, slug="demo", name="演示工作台", status="active", settings={})
        )
        db.add(
            User(
                id=1,
                email="owner@example.com",
                display_name="Owner",
                role=UserRole.OWNER,
            )
        )
        db.add(
            WorkspaceMembership(workspace_id=1, user_id=1, role=UserRole.OWNER)
        )
        db.commit()

    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)


def test_send_and_login_roundtrip():
    """发送验证码 → 用 debug_code 登录成功；再次登录不重复建号。"""
    client, _gen = _make_client()
    resp = client.post("/api/v1/auth/sms/send", json={"phone": "13800138000"})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ok"] is True
    assert len(body["debug_code"]) == 6  # console 通道回带，供演示/联调

    resp = client.post(
        "/api/v1/auth/sms/login", json={"phone": "13800138000", "code": body["debug_code"]}
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()
    assert token["access_token"]
    # 手机号映射为 sms.local 邮箱
    assert token["user"]["email"] == "13800138000@sms.local"

    # 第二次发送 + 登录：应复用同一用户，不重复建号
    resp = client.post("/api/v1/auth/sms/send", json={"phone": "13800138000"})
    code2 = resp.json()["debug_code"]
    resp = client.post(
        "/api/v1/auth/sms/login", json={"phone": "13800138000", "code": code2}
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["id"] == token["user"]["id"]


def test_login_with_wrong_code_rejected():
    client, _gen = _make_client()
    client.post("/api/v1/auth/sms/send", json={"phone": "13900139000"})
    resp = client.post(
        "/api/v1/auth/sms/login", json={"phone": "13900139000", "code": "000000"}
    )
    assert resp.status_code == 401


def test_send_rejects_invalid_phone():
    client, _gen = _make_client()
    resp = client.post("/api/v1/auth/sms/send", json={"phone": "12345"})
    assert resp.status_code == 422


def test_expired_code_rejected():
    client, _gen = _make_client()
    client.post("/api/v1/auth/sms/send", json={"phone": "13700137000"})
    stored = sms_service._CODE_STORE["13700137000"]
    stored.expires_at = 0
    resp = client.post(
        "/api/v1/auth/sms/login", json={"phone": "13700137000", "code": stored.code}
    )
    assert resp.status_code == 401


def test_provider_failure_returns_503():
    client, _gen = _make_client()
    with patch.object(
        sms_service, "_send_via_provider", side_effect=sms_service.SmsError("未配置")
    ):
        resp = client.post("/api/v1/auth/sms/send", json={"phone": "13600136000"})
    assert resp.status_code == 503
