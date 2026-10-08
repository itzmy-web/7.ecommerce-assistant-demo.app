"""生成媒体静态挂载的回归测试。

背景：图片/视频服务把素材落到 `api/uploads`，并返回 `/uploads/...` 形式的 URL。
若 main.py 没有把该目录挂到根路径，素材虽已落库、文件也在磁盘上，但 URL 会 404，
前端无法展示。本文件把「挂载存在」与「确实能取到文件」都钉死，防止该回归。
"""

import uuid

from fastapi.testclient import TestClient
from starlette.routing import Mount

from app.core.config import API_DIR
from app.main import app

PNG_MAGIC = bytes([137, 80, 78, 71, 13, 10, 26, 10])


def test_uploads_static_mount_is_registered() -> None:
    """验证“uploads静态挂载isregistered”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    mounted_paths = {route.path for route in app.routes if isinstance(route, Mount)}

    assert "/uploads" in mounted_paths


def test_uploads_static_mount_serves_real_file() -> None:
    """验证上传目录中的文件可经 /uploads 真实取回（端到端，非仅路由存在）。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    target_dir = API_DIR / "uploads" / "generated"
    target_dir.mkdir(parents=True, exist_ok=True)
    filename = f"pytest-static-{uuid.uuid4().hex}.png"
    file_path = target_dir / filename
    payload = PNG_MAGIC + b"pytest-static-serving-payload"
    file_path.write_bytes(payload)

    client = TestClient(app)
    try:
        response = client.get(f"/uploads/generated/{filename}")
    finally:
        file_path.unlink(missing_ok=True)

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content == payload
