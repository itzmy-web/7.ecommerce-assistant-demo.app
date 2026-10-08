"""第16章即梦（jimeng）接口契约测试：用替身响应验证，不访问真实供应商。

覆盖笔记 16.7.1 要求：5秒/10秒帧数、图片查询的 req_json、code 失败时 data 为空，
同时验证图片/视频提交任务的实际 payload 结构与 base64 兜底拒绝。
"""
import json
from types import SimpleNamespace

import pytest

from app.services import image_generation, video_generation
from app.services.image_generation import (
    ImageGenerationError,
    _create_jimeng_image_task,
    _extract_jimeng_image_url,
    _parse_image_size,
    _post_jimeng_json,
)
from app.services.video_generation import _duration_to_frames, create_jimeng_video_task


def test_duration_to_frames_matches_jimeng_contract() -> None:
    """验证“durationtoframesmatchesjimengcontract”场景，确保重构后仍满足预期业务与安全边界。"""
    # 即梦文生视频仅允许 121（5秒）或 241（10秒）帧；向下取整到 121，向上按 24×秒+1。
    assert _duration_to_frames(1) == 121
    assert _duration_to_frames(5) == 121
    assert _duration_to_frames(10) == 241
    assert _duration_to_frames(6) == 145


def test_parse_image_size_falls_back_to_default() -> None:
    """验证“解析图片sizefallsbacktodefault”场景，确保重构后仍满足预期业务与安全边界。"""
    assert _parse_image_size("1024*1024") == (1024, 1024)
    assert _parse_image_size("1280x720") == (1280, 720)
    assert _parse_image_size("bad-size") == (1328, 1328)


def test_jimeng_image_task_requests_url_and_uses_image_model(monkeypatch) -> None:
    """验证“jimeng图片任务requestsurnanduses图片模型”场景，确保重构后仍满足预期业务与安全边界。"""
    captured: dict = {}

    def fake_post(*, settings, action, payload, timeout):
        """构造或执行测试所需的假post，让测试数据、依赖替身与断言保持集中。"""
        captured["action"] = action
        captured["payload"] = payload
        return {"code": 10000, "data": {"task_id": "img-task-1"}}

    monkeypatch.setattr(image_generation, "_post_jimeng_json", fake_post)

    settings = _image_settings()
    task_id = _create_jimeng_image_task("一张燕麦饼干主图", settings)

    assert task_id == "img-task-1"
    assert captured["action"] == "CVSync2AsyncSubmitTask"
    payload = captured["payload"]
    assert payload["req_key"] == "jimeng_t2i_v30"
    assert payload["width"] == 1024 and payload["height"] == 1024
    # 必须显式要求返回 URL，否则供应商可能回传 base64。
    assert payload["req_json"] == json.dumps({"return_url": True}, ensure_ascii=False)


def test_jimeng_video_task_payload_has_frames_ratio_and_reference_images(monkeypatch) -> None:
    """验证“jimeng视频任务payloadextrahasframes比率andreference图片”场景，确保重构后仍满足预期业务与安全边界。"""
    captured: dict = {}

    def fake_post(*, settings, action, payload, timeout):
        """构造或执行测试所需的假post，让测试数据、依赖替身与断言保持集中。"""
        captured["action"] = action
        captured["payload"] = payload
        return {"code": 10000, "data": {"task_id": "video-task-1"}}

    monkeypatch.setattr(video_generation, "_post_jimeng_video_json", fake_post)

    settings = _video_settings()
    workflow = {"reference_images": ["a.png", "b.png", "c.png", "d.png"]}
    task_id = create_jimeng_video_task("5秒通勤场景短片", settings, workflow=workflow)

    assert task_id == "video-task-1"
    payload = captured["payload"]
    assert payload["req_key"] == "jimeng_t2v_v30"
    assert payload["frames"] == 121
    assert payload["aspect_ratio"] == "16:9"
    # 参考图最多取前 3 张。
    assert payload["image_urls"] == ["a.png", "b.png", "c.png"]


def test_jimeng_code_failure_with_null_data_raises(monkeypatch) -> None:
    """验证“jimengcodefailurewithnulldataraises”场景，确保重构后仍满足预期业务与安全边界。"""
    # 供应商失败时外层 code 非 10000，data 可能为 null；必须抛错而不是当成功。
    monkeypatch.setattr(
        image_generation.httpx,
        "Client",
        lambda **kwargs: _FakeClient({"code": 50000, "message": "quota exceeded", "data": None}),
    )

    with pytest.raises(ImageGenerationError):
        _post_jimeng_json(
            settings=_image_settings(),
            action="CVSync2AsyncSubmitTask",
            payload={"req_key": "jimeng_t2i_v30"},
            timeout=5,
        )


def test_jimeng_image_url_rejects_base64_payload() -> None:
    """验证“jimeng图片URLrejectsbase64载荷”场景，确保重构后仍满足预期业务与安全边界。"""
    with pytest.raises(ImageGenerationError):
        _extract_jimeng_image_url({"code": 10000, "data": {"binary_data_base64": ["AAAA"]}})


def test_jimeng_image_url_reads_nested_url() -> None:
    """验证“jimeng图片URLreadsnestedURL”场景，确保重构后仍满足预期业务与安全边界。"""
    url = _extract_jimeng_image_url({"code": 10000, "data": {"image_urls": ["https://x/1.png"]}})
    assert url == "https://x/1.png"


def _image_settings() -> SimpleNamespace:
    """构造或执行测试所需的图片settings，让测试数据、依赖替身与断言保持集中。"""
    return SimpleNamespace(
        image_api_key="AK_EXAMPLE:SK_EXAMPLE",
        image_base_url="https://visual.volcengineapi.com",
        image_model="jimeng_t2i_v30",
        image_size="1024*1024",
        image_poll_interval_seconds=5,
        image_poll_max_attempts=60,
    )


def _video_settings() -> SimpleNamespace:
    """构造或执行测试所需的视频settings，让测试数据、依赖替身与断言保持集中。"""
    return SimpleNamespace(
        video_api_key="AK_EXAMPLE:SK_EXAMPLE",
        video_base_url="https://visual.volcengineapi.com",
        video_model="jimeng_t2v_v30",
        video_duration=5,
        video_size="1280*720",
        video_poll_interval_seconds=10,
        video_poll_max_attempts=90,
    )


class _FakeResponse:
    """替身响应对象，模拟供应商 JSON 返回。"""

    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeClient:
    """替身 httpx.Client，不产生真实网络请求。"""

    def __init__(self, payload: dict) -> None:
        self._payload = payload

    def __enter__(self) -> "_FakeClient":
        return self

    def __exit__(self, *exc: object) -> bool:
        return False

    def post(self, *args: object, **kwargs: object) -> _FakeResponse:
        return _FakeResponse(self._payload)
