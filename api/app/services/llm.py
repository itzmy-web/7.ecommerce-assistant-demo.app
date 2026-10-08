import json
from typing import Any

import httpx

from app.core.config import Settings
from app.services.model_settings import get_runtime_settings

# 已知会输出 thinking/reasoning 内容的模型标识（小写匹配）。
# 这类模型会把 max_tokens 预算大量消耗在推理文本上，使结构化 content 被截断成非法 JSON，
# 因此命中时统一追加禁用 thinking 的参数；后续新增推理型模型只需扩展这个元组。
REASONING_MODEL_MARKERS: tuple[str, ...] = (
    "deepseek-v4",
    "deepseek-r1",
    "qwen3",
    "qwen-3",
    "qwq",
)


class LLMNotConfiguredError(RuntimeError):
    pass


class LLMResponseError(RuntimeError):
    pass


def is_llm_configured(settings: Settings | None = None) -> bool:
    """判断llmconfigured；集中执行业务校验、状态变更与持久化，并返回可验证结果。"""
    settings = settings or get_runtime_settings()
    return bool(settings.llm_base_url and settings.llm_api_key and settings.llm_model)


def create_json_chat_completion(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 1800,
    temperature: float = 0.3,
    settings: Settings | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """创建JSON对话模型补全；集中执行业务校验、状态变更与持久化，并返回可验证结果。"""
    # 按“输入归一化 → 业务校验 → 状态或持久化”推进，异常不得留下半完成结果。
    settings = settings or get_runtime_settings()
    if not is_llm_configured(settings):
        raise LLMNotConfiguredError("LLM provider is not configured.")

    # 所有业务生成都要求模型返回 JSON，后续才能落到可编辑字段，而不是不可解析的一整段报告。
    response_json = _post_chat_completion(
        settings=settings,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
    )
    content = _extract_message_content(response_json)
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError as exc:
        raise LLMResponseError("LLM response was not valid JSON.") from exc

    return parsed, response_json


def _post_chat_completion(
    *,
    settings: Settings,
    messages: list[dict[str, str]],
    max_tokens: int,
    temperature: float,
) -> dict[str, Any]:
    """发送对话模型补全，统一主流程中的格式、默认值和异常边界。"""
    # 按“输入归一化 → 业务校验 → 状态或持久化”推进，异常不得留下半完成结果。
    url = _chat_completion_url(settings.llm_base_url or "")
    payload: dict[str, Any] = {
        "model": settings.llm_model,
        "messages": messages,
        "response_format": {"type": "json_object"},
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False,
    }

    # 推理型模型（如 deepseek-v4、Qwen3 系列）的推理内容会增加解析不确定性，
    # 还会吃掉 max_tokens 导致 content 截断；这里关闭 thinking，优先保证结构化 JSON 稳定入库。
    model_name = (settings.llm_model or "").lower()
    if any(marker in model_name for marker in REASONING_MODEL_MARKERS):
        payload["thinking"] = {"type": "disabled"}

    try:
        with httpx.Client(timeout=60) as client:
            response = client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        detail = _safe_error_detail(exc.response)
        raise LLMResponseError(f"LLM provider returned an error: {detail}") from exc
    except httpx.HTTPError as exc:
        raise LLMResponseError("LLM provider request failed.") from exc

    return response.json()


def _chat_completion_url(base_url: str) -> str:
    """对话模型补全URL，统一主流程中的格式、默认值和异常边界。"""
    normalized = base_url.strip().rstrip("/")
    if normalized.endswith("/chat/completions"):
        return normalized
    return f"{normalized}/chat/completions"


def _extract_message_content(response_json: dict[str, Any]) -> str:
    """提取消息内容，统一主流程中的格式、默认值和异常边界。"""
    # 按“输入归一化 → 业务校验 → 状态或持久化”推进，异常不得留下半完成结果。
    try:
        content = response_json["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LLMResponseError("LLM response did not contain message content.") from exc

    if not isinstance(content, str) or not content.strip():
        raise LLMResponseError("LLM response content was empty.")
    return content


def _safe_error_detail(response: httpx.Response) -> str:
    # 错误信息只截取摘要，方便排查供应商问题，同时避免把过长响应或敏感内容写入异常链。
    """安全错误详情，统一主流程中的格式、默认值和异常边界。"""
    try:
        data = response.json()
    except ValueError:
        return response.text[:500]
    return json.dumps(data, ensure_ascii=False)[:500]
