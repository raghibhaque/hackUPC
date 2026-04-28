"""
Pipeline service — async job runner and SSE streaming for reconciliation tasks.
"""

import asyncio
import json
import time
from dataclasses import dataclass, field
from enum import Enum
from functools import partial
from typing import AsyncIterator, Optional
import uuid

from backend.core.ir.models import Schema
from backend.core.reconciliation.engine import ReconciliationEngine

_engine = ReconciliationEngine()


class JobStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class Job:
    id: str = ""
    status: JobStatus = JobStatus.PENDING
    progress: float = 0.0
    step: str = "pending"
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: float = field(default_factory=time.monotonic)

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())[:8]

    def to_dict(self) -> dict:
        return {
            "job_id": self.id,
            "status": self.status.value,
            "progress": self.progress,
            "step": self.step,
            "result": self.result,
            "error": self.error,
        }

    def is_expired(self, ttl_seconds: float) -> bool:
        return (time.monotonic() - self.created_at) > ttl_seconds


_jobs: dict[str, Job] = {}


def create_job() -> Job:
    job = Job()
    _jobs[job.id] = job
    return job


def get_job(job_id: str) -> Optional[Job]:
    return _jobs.get(job_id)


def update_job(job_id: str, **kwargs) -> None:
    job = _jobs.get(job_id)
    if job:
        for k, v in kwargs.items():
            setattr(job, k, v)


JOB_TTL_SECONDS: float = 3600.0  # 1 hour


def purge_expired_jobs(ttl_seconds: float = JOB_TTL_SECONDS) -> int:
    """Remove completed/errored jobs older than ttl_seconds. Returns the number purged."""
    terminal = {JobStatus.COMPLETE, JobStatus.ERROR}
    expired = [
        jid for jid, job in list(_jobs.items())
        if job.status in terminal and job.is_expired(ttl_seconds)
    ]
    for jid in expired:
        del _jobs[jid]
    return len(expired)


async def periodic_job_cleanup(interval_seconds: float = 300.0) -> None:
    """Background coroutine that purges expired jobs every interval_seconds."""
    while True:
        await asyncio.sleep(interval_seconds)
        purge_expired_jobs()


_POLL_INTERVAL = 0.05   # seconds between queue drains
_HEARTBEAT_EVERY = 10  # seconds between SSE keepalive comments


async def stream_reconciliation(source: Schema, target: Schema) -> AsyncIterator[str]:
    """Async generator that yields SSE-formatted strings with live progress and final result."""
    loop = asyncio.get_event_loop()
    queue: asyncio.Queue[dict] = asyncio.Queue()

    def _on_progress(progress: float, step: str) -> None:
        loop.call_soon_threadsafe(
            queue.put_nowait,
            {"type": "progress", "progress": progress, "step": step},
        )

    yield f"data: {json.dumps({'type': 'progress', 'progress': 0.0, 'step': 'starting'})}\n\n"

    fut = loop.run_in_executor(
        None,
        partial(_engine.reconcile, source, target, on_progress=_on_progress),
    )

    last_heartbeat = time.monotonic()
    while True:
        done = fut.done()
        while not queue.empty():
            yield f"data: {json.dumps(queue.get_nowait())}\n\n"
            last_heartbeat = time.monotonic()

        now = time.monotonic()
        if now - last_heartbeat >= _HEARTBEAT_EVERY:
            yield ": heartbeat\n\n"
            last_heartbeat = now

        if done:
            break
        await asyncio.sleep(_POLL_INTERVAL)

    try:
        result = await fut
        yield f"data: {json.dumps({'type': 'complete', 'progress': 1.0, 'step': 'complete', 'result': result.to_dict()})}\n\n"
    except Exception as exc:
        yield f"data: {json.dumps({'type': 'error', 'error': str(exc)})}\n\n"


async def run_reconciliation_job(job_id: str, source: Schema, target: Schema) -> None:
    loop = asyncio.get_event_loop()

    def _on_progress(progress: float, step: str) -> None:
        update_job(job_id, progress=progress, step=step)

    update_job(job_id, status=JobStatus.RUNNING, step="starting", progress=0.0)
    try:
        result = await loop.run_in_executor(
            None,
            partial(_engine.reconcile, source, target, on_progress=_on_progress),
        )
        update_job(
            job_id,
            status=JobStatus.COMPLETE,
            step="complete",
            progress=1.0,
            result=result.to_dict(),
        )
    except Exception as exc:
        update_job(job_id, status=JobStatus.ERROR, step="error", error=str(exc))
