"""LLM-as-judge 质量门禁测试：双门禁合并、低分拒绝、LLM 故障回退规则。"""

from typing import Any

import pytest

from app.agents import quality_judge
from app.services.llm import LLMNotConfiguredError, LLMResponseError


def _clean_context() -> dict[str, Any]:
    return {"product": {"id": 1, "title": "测试商品"}}


def _clean_outputs() -> dict[str, Any]:
    return {"creative": {"headline": "夏日清爽上新", "detail": "限时 8 折"}}


def _judge_payload(verdict: str, score: int, issues: list | None = None) -> dict[str, Any]:
    return {
        "verdict": verdict,
        "score": score,
        "issues": issues or [],
        "summary": "评审完成",
        "dimension_scores": {"compliance": score, "relevance": score, "actionability": score},
    }


def _patch_llm(monkeypatch: pytest.MonkeyPatch, payload: dict[str, Any]) -> None:
    monkeypatch.setattr(
        quality_judge.llm,
        "create_json_chat_completion",
        lambda *args, **kwargs: (payload, {"raw": True}),
    )


def test_judge_pass_merges_into_rule_result(monkeypatch: pytest.MonkeyPatch) -> None:
    """LLM 评审通过：整体通过，checked_rules 追加 llm_judge，score 取较小值。"""
    _patch_llm(monkeypatch, _judge_payload("pass", 92))

    result = quality_judge.merge_rule_and_judge(
        {
            "passed": True,
            "score": 100,
            "issues": [],
            "checked_rules": ["non_empty"],
        },
        quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()),
    )
    assert result["passed"] is True
    assert result["score"] == 92  # min(100, 92)
    assert result["checked_rules"] == ["non_empty", "llm_judge"]
    assert result["judge"]["verdict"] == "pass"


def test_judge_fail_blocks_overall_result(monkeypatch: pytest.MonkeyPatch) -> None:
    """规则通过但 LLM 判 fail：整体必须 fail，问题并入 issues。"""
    issue = [{"code": "exaggeration", "severity": "error", "message": "效果表述夸大"}]
    _patch_llm(monkeypatch, _judge_payload("fail", 45, issue))

    result = quality_judge.merge_rule_and_judge(
        {"passed": True, "score": 100, "issues": [], "checked_rules": ["non_empty"]},
        quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()),
    )
    assert result["passed"] is False
    assert result["score"] == 45
    assert result["issues"][0]["code"] == "judge.exaggeration"


def test_judge_low_score_without_issues_adds_reason(monkeypatch: pytest.MonkeyPatch) -> None:
    """fail 却没给 issues：自动补一条 score_below_threshold，拒绝原因可审计。"""
    _patch_llm(monkeypatch, _judge_payload("fail", 30))

    result = quality_judge.merge_rule_and_judge(
        {"passed": True, "score": 100, "issues": [], "checked_rules": []},
        quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()),
    )
    assert result["passed"] is False
    assert result["issues"][0]["code"] == "judge.score_below_threshold"


def test_judge_unconfigured_falls_back_to_rules(monkeypatch: pytest.MonkeyPatch) -> None:
    """LLM 未配置：llm_quality_judge 返回 None，合并后原样保留规则结果。"""
    def _raise(*args: Any, **kwargs: Any) -> Any:
        raise LLMNotConfiguredError("LLM provider is not configured.")

    monkeypatch.setattr(quality_judge.llm, "create_json_chat_completion", _raise)
    assert quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()) is None

    rule = {"passed": True, "score": 100, "issues": [], "checked_rules": ["non_empty"]}
    result = quality_judge.merge_rule_and_judge(rule, None)
    assert result is rule  # 原样返回，不新增字段


def test_judge_invalid_response_falls_back_to_rules(monkeypatch: pytest.MonkeyPatch) -> None:
    """LLM 返回不合法（非 JSON/字段缺失）：一律回退规则，不让坏响应污染门禁。"""
    def _raise(*args: Any, **kwargs: Any) -> Any:
        raise LLMResponseError("LLM response was not valid JSON.")

    monkeypatch.setattr(quality_judge.llm, "create_json_chat_completion", _raise)
    assert quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()) is None

    # verdict 非法
    _patch_llm(monkeypatch, {"verdict": "maybe", "score": 88})
    assert quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()) is None

    # score 越界
    _patch_llm(monkeypatch, _judge_payload("pass", 250))
    assert quality_judge.llm_quality_judge(_clean_context(), _clean_outputs()) is None
