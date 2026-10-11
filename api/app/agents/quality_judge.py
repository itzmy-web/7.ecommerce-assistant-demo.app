"""LLM-as-judge 质量门禁。

规则门禁（黑名单/非空/上下文完整）先行，全部通过后再交由 LLM 按
"合规性 / 业务相关性 / 可执行性" 三个维度打分复核：
- LLM 可用：合并双方结论，任一方 fail 即整体 fail（双门禁）。
- LLM 未配置/超时/返回不合法：静默回退纯规则结果（与项目"规则兜底"惯例一致，
  绝不能让评审通道故障阻塞业务工作流）。

judge 输出只作为门禁依据，不直接改写业务产出；理由与分数落入 quality_report 供审计。
"""

import json
from typing import Any

from app.services import llm

# 交给 judge 的上下文/产出文本上限：评审只看要点，超出部分截断，
# 既控 token 成本，也避免长尾输出把判断重心带偏。
_MAX_CONTEXT_CHARS = 2000
_MAX_OUTPUTS_CHARS = 4000
_JUDGE_MIN_SCORE = 60


def _compact_json(value: Any, limit: int) -> str:
    """序列化为紧凑 JSON 并截断到 limit；只交换结构化 Agent 状态，保证可复现。"""
    try:
        text = json.dumps(value, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        text = str(value)
    if len(text) > limit:
        text = text[:limit] + "…(截断)"
    return text


_JUDGE_SYSTEM_PROMPT = (
    "你是电商运营内容的合规与质量评审员。基于给定的业务上下文与 Agent 产出，"
    "从三个维度评分（各 0-100）：compliance(合规：无虚假夸大宣传、无违禁承诺、"
    "无误导消费者表达)、relevance(业务相关性：内容与商品/店铺/任务目标匹配)、"
    "actionability(可执行性：建议具体可落地，而非空泛套话)。\n"
    "只输出 JSON 对象："
    '{"verdict":"pass"或"fail","score":0-100的整数,"issues":[{"code":"英文标识",'
    '"severity":"error"或"warning","message":"中文说明"}],"summary":"一句中文总评"}\n'
    "任一维度低于 60 即 verdict=fail。issues 只写发现的问题，没有就给空数组。"
)


def llm_quality_judge(
    context: dict[str, Any], outputs: dict[str, Any]
) -> dict[str, Any] | None:
    """调用 LLM 复核产出质量；任何故障返回 None，由调用方回退纯规则结果。

    返回结构：{"verdict": str, "score": int, "issues": list, "summary": str,
    "dimension_scores": dict}。字段缺失或类型不对一律视为评审失败（None）。
    """
    try:
        parsed, _raw = llm.create_json_chat_completion(
            messages=[
                {"role": "system", "content": _JUDGE_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "【业务上下文】\n"
                        + _compact_json(context, _MAX_CONTEXT_CHARS)
                        + "\n【Agent 产出】\n"
                        + _compact_json(outputs, _MAX_OUTPUTS_CHARS)
                    ),
                },
            ],
            max_tokens=600,
            temperature=0.1,
        )
    except (llm.LLMNotConfiguredError, llm.LLMResponseError):
        return None

    if not isinstance(parsed, dict):
        return None
    verdict = parsed.get("verdict")
    score = parsed.get("score")
    issues = parsed.get("issues", [])
    if verdict not in ("pass", "fail"):
        return None
    if not isinstance(score, int) or not 0 <= score <= 100:
        return None
    if not isinstance(issues, list):
        issues = []
    clean_issues = []
    for issue in issues:
        if not isinstance(issue, dict):
            continue
        clean_issues.append(
            {
                "code": f"judge.{issue.get('code', 'unclassified')}",
                "severity": "error" if issue.get("severity") == "error" else "warning",
                "message": str(issue.get("message", ""))[:500],
            }
        )
    return {
        "verdict": verdict,
        "score": score,
        "issues": clean_issues,
        "summary": str(parsed.get("summary", ""))[:500],
        "dimension_scores": parsed.get("dimension_scores")
        if isinstance(parsed.get("dimension_scores"), dict)
        else None,
    }


def merge_rule_and_judge(
    rule_result: dict[str, Any], judge_result: dict[str, Any] | None
) -> dict[str, Any]:
    """合并规则门禁与 LLM 评审结论；judge 缺席时原样返回规则结果。

    合并口径：passed = 规则通过 且 judge 通过；score = 规则分与 judge 分取较小值
    （门禁取保守值，宁可误杀不可放过）；judge 的问题并入 issues。
    """
    if judge_result is None:
        return rule_result
    judge_passed = judge_result["verdict"] == "pass"
    issues = list(rule_result.get("issues", [])) + list(judge_result.get("issues", []))
    merged_score = min(int(rule_result.get("score", 0)), int(judge_result["score"]))
    # judge 分数本身低于阈值时显式补一条 issue，让前端/审计能看到拒绝原因。
    if not judge_passed and not judge_result.get("issues"):
        issues.append(
            {
                "code": "judge.score_below_threshold",
                "severity": "error",
                "message": (
                    f"LLM 评审总分 {judge_result['score']} 低于门禁 "
                    f"{_JUDGE_MIN_SCORE}：{judge_result.get('summary', '')}"
                ),
            }
        )
    return {
        **rule_result,
        "passed": bool(rule_result.get("passed")) and judge_passed,
        "score": merged_score,
        "issues": issues,
        "checked_rules": list(rule_result.get("checked_rules", [])) + ["llm_judge"],
        "judge": {
            "verdict": judge_result["verdict"],
            "score": judge_result["score"],
            "summary": judge_result.get("summary", ""),
            "dimension_scores": judge_result.get("dimension_scores"),
        },
    }
