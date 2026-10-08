"""第18章基础验收：Agent 结构化状态、工具权限边界与观测快照脱敏。

注意导入来源：本项目的低层白名单校验 `require_tool_permission` 与配套的
`AgentPolicyError` 定义在 `app.agents.definitions`；而 `app.agents.policy`
提供的是带 R0–R3 风险分级的 `authorize_tool`，它自己也定义了一个**独立的**
`AgentPolicyError`。两个同名异常类互不继承，`pytest.raises` 必须与被调用方
使用同一个类，否则会出现「明明抛了异常却断言失败」。因此这里统一从
`definitions` 导入。

测试全程不访问真实模型或外部投递，仅验证策略边界与纯函数行为。
"""

import pytest

from app.agents.contracts import AgentWorkflowState
from app.agents.definitions import (
    PRODUCT_CONTEXT_AGENT,
    AgentPolicyError,
    require_tool_permission,
)
from app.agents.harness import redact_snapshot


def test_foundation_import_and_allowed_tool():
    """结构化状态可构造，且白名单内的只读工具放行。"""
    state: AgentWorkflowState = {"product_id": 1}
    assert state["product_id"] == 1
    require_tool_permission(PRODUCT_CONTEXT_AGENT, "product_context.read")


def test_forbidden_tool_is_rejected():
    """上下文节点越权调用模型工具应被策略拒绝。"""
    with pytest.raises(AgentPolicyError):
        require_tool_permission(PRODUCT_CONTEXT_AGENT, "model.complete")


def test_unknown_agent_is_rejected():
    """未注册的 Agent 一律拒绝，避免绕过注册表。"""
    with pytest.raises(AgentPolicyError):
        require_tool_permission("unknown_agent", "product_context.read")


def test_snapshot_redacts_nested_secrets():
    """观测快照需递归脱敏，顶层与嵌套的敏感字段都要被遮蔽。"""
    result = redact_snapshot({"api_key": "test-key", "nested": {"password": "test-password"}})
    assert result["api_key"] == "[redacted]"
    assert result["nested"]["password"] == "[redacted]"
