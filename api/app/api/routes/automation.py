"""自动化任务中心：把散落的定时/排队工作聚合成一个只读视图。

聚合口径（全部只读，不产生副作用）：
- 系统心跳：celery beat 里登记的维护任务（outbox 分发 / agent 运行时维护）。
- 竞品监控：active 监控的下一次检查时间（由 maintenance worker 到期触发）。
- Agent 任务：当前排队 / 运行 / 待审批中的任务。
- 生成作业：图片/视频生成作业的排队与运行中数量。
"""

from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.routes.auth import require_view_permission
from app.db.session import get_db
from app.models import (
    AgentRun,
    AgentRunStatus,
    AgentTask,
    AgentTaskStatus,
    CompetitorMonitor,
    GenerationJob,
    Product,
    User,
)

router = APIRouter(prefix="/automation", tags=["automation"])
DbSession = Annotated[Session, Depends(get_db)]
ViewUser = Annotated[User, Depends(require_view_permission)]

# 与 worker/celery_app.py 的 beat_schedule 保持同步的展示清单。
SYSTEM_HEARTBEATS = [
    {"name": "Outbox 事件分发", "task": "maintenance.dispatch_outbox", "every_seconds": 5, "description": "把已提交的 Agent 任务派发到执行队列"},
    {"name": "Agent 运行时维护", "task": "maintenance.agent_runtime", "every_seconds": 30, "description": "回收超时租约、重投中断任务、过期审批自动处理"},
]


@router.get("/overview")
def automation_overview(db: DbSession, current_user: ViewUser) -> dict[str, Any]:
    """聚合当前工作台的自动化视图；只统计当前登录用户可见工作台的数据。"""
    now = datetime.now(UTC)

    monitors = db.scalars(
        select(CompetitorMonitor).where(CompetitorMonitor.status == "active").order_by(CompetitorMonitor.next_check_at)
    ).all()
    monitor_rows = []
    for m in monitors:
        product = db.get(Product, m.product_id)
        monitor_rows.append(
            {
                "id": m.id,
                "product_id": m.product_id,
                "product_name": product.name if product else f"商品 #{m.product_id}",
                "status": m.status,
                "interval_days": m.interval_days,
                "last_checked_at": m.last_checked_at.isoformat() if m.last_checked_at else None,
                "next_check_at": m.next_check_at.isoformat() if m.next_check_at else None,
                "overdue": bool(m.next_check_at and m.next_check_at < now),
            }
        )

    active_task_statuses = [AgentTaskStatus.QUEUED, AgentTaskStatus.RUNNING, AgentTaskStatus.AWAITING_APPROVAL]
    active_tasks = db.scalars(
        select(AgentTask).where(AgentTask.status.in_(active_task_statuses)).order_by(AgentTask.created_at.desc())
    ).all()
    task_rows = [
        {
            "id": t.id,
            "title": t.title,
            "workflow_key": t.workflow_key,
            "status": t.status,
            "risk_level": t.risk_level,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in active_tasks
    ]

    generation_running = db.scalar(
        select(func.count()).select_from(GenerationJob).where(GenerationJob.status.in_(["pending", "running"]))
    )

    queued_runs = db.scalar(select(func.count()).select_from(AgentRun).where(AgentRun.status == AgentRunStatus.QUEUED))
    running_runs = db.scalar(select(func.count()).select_from(AgentRun).where(AgentRun.status == AgentRunStatus.RUNNING))

    return {
        "generated_at": now.isoformat(),
        "system_heartbeats": SYSTEM_HEARTBEATS,
        "competitor_monitors": monitor_rows,
        "active_agent_tasks": task_rows,
        "generation_jobs_active": int(generation_running or 0),
        "agent_runs_queued": int(queued_runs or 0),
        "agent_runs_running": int(running_runs or 0),
    }
