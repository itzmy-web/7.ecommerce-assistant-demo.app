"""第20章验收：组件可导入 + 检查点走既有配置属性。

与笔记唯一不同：stub 的配置字段名。笔记示例给 `get_settings()` 造了
`checkpoint_database_url`，但项目 `Settings` 上并不存在该字段——真实使用
的是 config.py 中既有的 `agent_checkpoint_connection_url` 属性（它内部会
优先取 `agent_checkpoint_database_url`，否则按 host/port/user/... 拼装）。
`open_postgres_checkpointer()` 读的就是它。此处按项目实际字段改 stub，测试
"复用既有配置属性"的本意不变。
"""

from contextlib import contextmanager
from types import SimpleNamespace

from app.agents import persistence
from app.agents.platform_graph import build_platform_workflow_graph
from app.agents.tool_gateway import ToolGateway


def test_component_imports():
    assert callable(build_platform_workflow_graph)
    assert callable(ToolGateway)


def test_checkpointer_uses_existing_config_property(monkeypatch):
    calls = []
    class Saver:
        def setup(self):
            calls.append("setup")
    @contextmanager
    def connect(url):
        calls.append(url)
        yield Saver()
    monkeypatch.setattr(persistence, "get_settings", lambda: SimpleNamespace(
        agent_checkpoint_connection_url="postgresql://test:test@localhost/test"))
    monkeypatch.setattr(persistence.PostgresSaver, "from_conn_string", connect)
    with persistence.open_postgres_checkpointer() as saver:
        assert isinstance(saver, Saver)
    assert calls == ["postgresql://test:test@localhost/test", "setup"]
