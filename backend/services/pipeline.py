"""
Pipeline service — runs reconciliation as a background task.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional
import uuid


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
    result: Optional[dict] = None
    error: Optional[str] = None

    def __post_init__(self):
        if not self.id:
            self.id = str(uuid.uuid4())[:8]


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