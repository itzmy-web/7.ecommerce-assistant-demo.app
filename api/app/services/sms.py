"""短信验证码服务：可插拔通道 + 内存验证码存储。

- 通道抽象：console（开发/演示：验证码打到日志，并在接口返回 debug_code）
  / aliyun（生产：占位实现，填入 AccessKey 后接 SDK）。
- 存储说明：单进程内存 dict + 过期时间，够开发与单实例部署使用；
  多实例部署时把 `_CODE_STORE` 换成 Redis（SETNX + EXPIRE）即可，接口不变。
- 手机号不复刻数据库列：登录用户以 `{phone}@sms.local` 作为 email 落库，
  该账号无密码哈希，只能走短信通道登录，天然与邮箱密码登录隔离。
"""

import logging
import random
import time
from dataclasses import dataclass

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_CODE_TTL_SECONDS = 300
_CODE_LENGTH = 6


class SmsError(RuntimeError):
    """短信通道配置或发送失败。"""


@dataclass
class _StoredCode:
    code: str
    expires_at: float
    attempts: int = 0


# {phone: _StoredCode}；模块级单例，进程内共享。
_CODE_STORE: dict[str, _StoredCode] = {}

_MAX_VERIFY_ATTEMPTS = 5


def _send_via_provider(phone: str, code: str) -> None:
    """按配置的通道发送验证码；console 通道打日志，aliyun 未配置前显式报错。"""
    provider = get_settings().sms_provider
    if provider == "console":
        # 开发/演示通道：只打日志，不接真实运营商。
        logger.info("[SMS:console] 向 %s 发送验证码 %s（5 分钟内有效）", phone, code)
        return
    if provider == "aliyun":
        # 生产占位：接入阿里云短信需要 AccessKey + 短信签名/模板 ID，配置齐全后在此实现。
        raise SmsError("阿里云短信通道尚未配置 AccessKey/签名/模板，请先在 .env 配置 SMS_ALIYUN_*")
    raise SmsError(f"未知的短信通道：{provider}")


def send_sms_code(phone: str) -> tuple[str, int]:
    """生成并下发验证码，返回 (验证码, 有效期秒数)。手机号不合法直接抛 ValueError。"""
    if not _is_valid_cn_phone(phone):
        raise ValueError("手机号格式不正确")
    code = "".join(random.choices("0123456789", k=_CODE_LENGTH))
    _send_via_provider(phone, code)
    _CODE_STORE[phone] = _StoredCode(code=code, expires_at=time.time() + _CODE_TTL_SECONDS)
    return code, _CODE_TTL_SECONDS


def verify_sms_code(phone: str, code: str) -> bool:
    """校验验证码：成功即作废；连续错 5 次作废重发；过期/不存在返回 False。"""
    stored = _CODE_STORE.get(phone)
    if stored is None or stored.expires_at < time.time():
        _CODE_STORE.pop(phone, None)
        return False
    stored.attempts += 1
    if stored.attempts > _MAX_VERIFY_ATTEMPTS:
        _CODE_STORE.pop(phone, None)
        return False
    if stored.code != code:
        return False
    _CODE_STORE.pop(phone, None)
    return True


def phone_to_login_email(phone: str) -> str:
    """手机号登录用户的落库 email 映射；与邮箱密码登录天然隔离（无密码哈希）。"""
    return f"{phone}@sms.local"


def _is_valid_cn_phone(phone: str) -> bool:
    return len(phone) == 11 and phone.startswith("1") and phone.isdigit()
