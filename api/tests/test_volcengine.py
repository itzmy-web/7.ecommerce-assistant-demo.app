from datetime import UTC, datetime

from app.services.video_generation import _aspect_ratio_from_size, _duration_to_frames
from app.services.volcengine import parse_access_key_pair, signed_json_headers


def test_parse_access_key_pair() -> None:
    """验证“解析访问keypair”场景，确保重构后仍满足预期业务与安全边界。"""
    assert parse_access_key_pair("ak:sk") == ("ak", "sk")


def test_signed_json_headers_are_deterministic() -> None:
    """验证“签名JSONheadersaredeterministic”场景，确保重构后仍满足预期业务与安全边界。"""
    # 按 Arrange、Act、Assert 组织场景，重点检查可观察状态和副作用。
    headers = signed_json_headers(
        access_key="ak",
        secret_key="sk",
        method="POST",
        url="https://visual.volcengineapi.com",
        query={"Action": "CVSync2AsyncSubmitTask", "Version": "2022-08-31"},
        body=b'{"req_key":"jimeng_t2i_v31"}',
        request_time=datetime(2026, 6, 1, 1, 2, 3, tzinfo=UTC),
    )

    assert headers["X-Date"] == "20260601T010203Z"
    assert headers["Host"] == "visual.volcengineapi.com"
    assert "Credential=ak/20260601/cn-north-1/cv/request" in headers["Authorization"]
    assert "Signature=" in headers["Authorization"]


def test_signature_matches_official_volcengine_sdk() -> None:
    """签名 golden vector：与官方 volcengine SDK 逐字节一致（SK 不加 "VOLC" 前缀）。

    值来源：用隔离环境里的官方 volcengine SDK（SignerV4，region=cn-north-1/service=cv）
    对同一组固定输入签名，并用独立手写 HMAC 链第三次复算，三者得到同一 Signature。
    官方 SDK 源码 SignerV4.get_signing_secret_key_v4 明确以「原始 SK」作为 HMAC 初始密钥
    （kdate = hmac_sha256(sk, date)），不含任何前缀。

    回归意义：早期把初始密钥写成 "VOLC{sk}" 会导致真实调用返回
    SignatureDoesNotMatch(100010)；本用例把正确签名钉死，防止该写法再次出现。
    """
    headers = signed_json_headers(
        access_key="ak",
        secret_key="sk",
        method="POST",
        url="https://visual.volcengineapi.com",
        query={"Action": "CVSync2AsyncSubmitTask", "Version": "2022-08-31"},
        body=b'{"req_key":"jimeng_t2i_v31"}',
        request_time=datetime(2026, 6, 1, 1, 2, 3, tzinfo=UTC),
    )

    assert headers["Authorization"] == (
        "HMAC-SHA256 "
        "Credential=ak/20260601/cn-north-1/cv/request, "
        "SignedHeaders=content-type;host;x-content-sha256;x-date, "
        "Signature=176b0a8233b66b0c408362c464589796151ddd6c04d479eab55e81b8ce4ee178"
    )


def test_jimeng_video_helpers() -> None:
    """验证“jimeng视频helpers”场景，确保重构后仍满足预期业务与安全边界。"""
    assert _duration_to_frames(5) == 121
    assert _duration_to_frames(8) == 193
    assert _aspect_ratio_from_size("1280*720") == "16:9"
    assert _aspect_ratio_from_size("720*1280") == "9:16"
