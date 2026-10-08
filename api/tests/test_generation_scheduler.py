"""第17章调度器测试：用内存数据库与替身验证到期调度语义，不连真实 Redis/供应商。

覆盖笔记 17.8.1 要求：自动到期重试、上限停止、提前到达的重复消息跳过、取消任务跳过、路由接入。
本项目的"扫描到期任务"入口是 `process_next_generation_job()`（取一条最早的到期 PENDING 任务执行）。
"""
from datetime import UTC, datetime, timedelta

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.models import (
    Base,
    CreativePlan,
    CreativePlanType,
    GenerationJob,
    GenerationJobEvent,
    GenerationJobKind,
    GenerationJobStatus,
    Product,
)
from app.services import generation_jobs
from app.services.generation_jobs import enqueue_generation_job, process_next_generation_job

API = "/api/v1"
STAGE17_ROUTES = [
    "/products/{product_id}/creative-plans/{creative_plan_id}/images/generate",
    "/products/{product_id}/creative-plans/{creative_plan_id}/videos/generate",
    "/products/{product_id}/generation-jobs/{job_id}/retry",
    "/products/{product_id}/generation-jobs/{job_id}/cancel",
]


def test_process_next_returns_none_when_nothing_is_due(monkeypatch) -> None:
    """验证“提前到达的任务不被调度”场景，确保 next_run_at 未到期时调度器跳过。"""
    factory = _sqlite_session_factory(monkeypatch)
    _seed_job(factory, next_run_at=datetime.now(UTC) + timedelta(hours=1))

    assert process_next_generation_job() is None


def test_process_next_runs_due_job_and_marks_succeeded(monkeypatch) -> None:
    """验证“到期任务被调度并成功”场景，确保状态机把 pending→running→succeeded。"""
    factory = _sqlite_session_factory(monkeypatch)
    _stub_successful_generation(monkeypatch)
    job_id = _seed_job(factory, next_run_at=datetime.now(UTC) - timedelta(minutes=1))

    processed = process_next_generation_job(worker_id="scheduler-test")

    assert processed == job_id
    with factory() as db:
        job = db.get(GenerationJob, job_id)
        assert job.status == GenerationJobStatus.SUCCEEDED
        assert job.attempts == 1
        assert job.next_run_at is None
        assert job.result["url"].endswith(".png")
        events = {e.event_type for e in db.query(GenerationJobEvent).filter_by(job_id=job_id)}
        assert {"started", "succeeded"} <= events


def test_failed_generation_schedules_backoff_retry(monkeypatch) -> None:
    """验证“失败后自动到期重试”场景，确保 attempts 未达上限时回到 pending 并安排下次运行。"""
    factory = _sqlite_session_factory(monkeypatch)
    _stub_failing_generation(monkeypatch)
    job_id = _seed_job(factory, next_run_at=datetime.now(UTC) - timedelta(minutes=1), attempts=0)

    before = datetime.now(UTC).replace(tzinfo=None)
    assert process_next_generation_job() == job_id

    with factory() as db:
        job = db.get(GenerationJob, job_id)
        assert job.status == GenerationJobStatus.PENDING
        assert job.attempts == 1
        # 退避时间 = min(attempts*2, 10) 分钟，必须晚于当前时间。
        # 注意 SQLite 取回的 datetime 是 naive（无时区），用 naive UTC 基准比较。
        assert job.next_run_at is not None and job.next_run_at > before
        event_types = [e.event_type for e in db.query(GenerationJobEvent).filter_by(job_id=job_id)]
        assert "retry_scheduled" in event_types


def test_failed_generation_stops_at_max_attempts(monkeypatch) -> None:
    """验证“达到上限后停止重试”场景，确保 attempts 触顶后置为 failed 且不再被调度。"""
    factory = _sqlite_session_factory(monkeypatch)
    _stub_failing_generation(monkeypatch)
    # 预置 attempts=2，执行时自增到 3 == max_attempts，正好触顶。
    job_id = _seed_job(factory, next_run_at=datetime.now(UTC) - timedelta(minutes=1), attempts=2)

    assert process_next_generation_job() == job_id

    with factory() as db:
        job = db.get(GenerationJob, job_id)
        assert job.status == GenerationJobStatus.FAILED
        assert job.next_run_at is None
        assert job.error

    # 已经是 failed，不再属于 PENDING，扫描器不应再选中它。
    assert process_next_generation_job() is None


def test_cancelled_job_is_skipped_by_scheduler(monkeypatch) -> None:
    """验证“取消任务被跳过”场景，确保 cancelled 任务不会被调度执行。"""
    factory = _sqlite_session_factory(monkeypatch)
    _stub_successful_generation(monkeypatch)
    _seed_job(
        factory,
        status=GenerationJobStatus.CANCELLED,
        next_run_at=datetime.now(UTC) - timedelta(minutes=1),
    )

    assert process_next_generation_job() is None


def test_stage17_generation_routes_are_registered() -> None:
    """验证“路由接入”场景，确保四个生成/重试/取消接口已注册且为 POST。"""
    exposed = app.openapi()["paths"]
    for path in STAGE17_ROUTES:
        full = f"{API}{path}"
        assert full in exposed, f"{full} 未注册"
        assert "post" in exposed[full], f"{full} 没有 POST 方法"


def _sqlite_session_factory(monkeypatch):
    """构造或执行测试所需的会话工厂，让测试数据、依赖替身与断言保持集中。"""
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    # process_next_generation_job/run_generation_job 内部使用全局 SessionLocal，替换成内存库。
    monkeypatch.setattr(generation_jobs, "SessionLocal", factory)
    return factory


def _stub_successful_generation(monkeypatch) -> None:
    """构造或执行测试所需的成功替身，让测试数据、依赖替身与断言保持集中。"""
    monkeypatch.setattr(
        generation_jobs,
        "generate_main_image_asset",
        lambda creative_plan: {"url": "/uploads/generated/stub.png", "provider": "jimeng"},
    )
    monkeypatch.setattr(generation_jobs, "create_generated_asset", lambda *a, **k: None)


def _stub_failing_generation(monkeypatch) -> None:
    """构造或执行测试所需的失败替身，让测试数据、依赖替身与断言保持集中。"""
    def _boom(creative_plan):
        """构造或执行测试所需的boom，让测试数据、依赖替身与断言保持集中。"""
        raise RuntimeError("provider timeout")

    monkeypatch.setattr(generation_jobs, "generate_main_image_asset", _boom)
    monkeypatch.setattr(generation_jobs, "create_generated_asset", lambda *a, **k: None)


def _seed_job(
    factory,
    *,
    kind: GenerationJobKind = GenerationJobKind.MAIN_IMAGE_ASSET,
    status: GenerationJobStatus = GenerationJobStatus.PENDING,
    next_run_at: datetime | None = None,
    attempts: int = 0,
) -> int:
    """构造或执行测试所需的任务，让测试数据、依赖替身与断言保持集中。"""
    with factory() as db:
        product = Product(name="低糖燕麦饼干")
        plan = CreativePlan(
            product=product,
            type=CreativePlanType.MAIN_IMAGE,
            title="主图方案",
            content={},
        )
        db.add_all([product, plan])
        db.flush()
        job = enqueue_generation_job(
            db,
            product_id=product.id,
            creative_plan_id=plan.id,
            kind=kind,
        )
        job.status = status
        job.attempts = attempts
        job.next_run_at = next_run_at
        db.commit()
        return job.id
