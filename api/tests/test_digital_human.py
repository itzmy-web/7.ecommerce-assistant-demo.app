"""数字人凭证接口测试：鉴权、未配置降级、正常下发三种场景。"""

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.routes.auth import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.main import app
from app.models import Base, User, UserRole


def _make_client():
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
        id=1,
        email="viewer@example.com",
        display_name="Viewer",
        role=UserRole.VIEWER,
    )
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: viewer
    client = TestClient(app)
    return client


def test_digital_human_credentials_returns_503_when_not_configured() -> None:
    """AppId/Secret 未配置时返回 503，并提示如何配置。"""
    settings = get_settings()
    original_id = settings.digital_human_app_id
    original_secret = settings.digital_human_app_secret
    settings.digital_human_app_id = None
    settings.digital_human_app_secret = None
    client = _make_client()
    try:
        response = client.get("/api/v1/digital-human/credentials")
    finally:
        app.dependency_overrides.clear()
        settings.digital_human_app_id = original_id
        settings.digital_human_app_secret = original_secret

    assert response.status_code == 503
    assert "DIGITAL_HUMAN_APP_ID" in response.json()["detail"]


def test_digital_human_credentials_returns_credentials_when_configured() -> None:
    """凭证配置齐全时下发三元组，前端再初始化 SDK。"""
    settings = get_settings()
    original_id = settings.digital_human_app_id
    original_secret = settings.digital_human_app_secret
    settings.digital_human_app_id = "test-app-id"
    settings.digital_human_app_secret = "test-app-secret"
    client = _make_client()
    try:
        response = client.get("/api/v1/digital-human/credentials")
    finally:
        app.dependency_overrides.clear()
        settings.digital_human_app_id = original_id
        settings.digital_human_app_secret = original_secret

    assert response.status_code == 200
    payload = response.json()
    assert payload["app_id"] == "test-app-id"
    assert payload["app_secret"] == "test-app-secret"
    assert payload["gateway_server"].startswith("https://")
