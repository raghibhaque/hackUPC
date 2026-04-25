"""Health and readiness check endpoints."""

import time

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from backend.api.errors import ErrorCode, ErrorResponse
from backend.core.reconciliation.engine import ReconciliationEngine

router = APIRouter(prefix="/health", tags=["health"])

START_TIME = time.time()
_reconciliation_count = 0


def increment_reconciliation_count():
    global _reconciliation_count
    _reconciliation_count += 1


@router.get("/")
async def health():
    """Basic liveness check."""
    return {
        "status": "ok",
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "reconciliations_run": _reconciliation_count,
    }


@router.get("/ready")
async def readiness():
    """Readiness check — verifies core components are loaded."""
    try:
        ReconciliationEngine()
        return {
            "status": "ready",
            "engine": "ok",
            "uptime_seconds": round(time.time() - START_TIME, 2),
        }
    except Exception as e:
        body = ErrorResponse(
            error=ErrorCode.SERVICE_UNAVAILABLE.value,
            message="Service not ready",
            detail=str(e),
        ).model_dump()
        return JSONResponse(status_code=503, content=body)
