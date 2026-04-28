"""
SchemaSync Backend — FastAPI application.

Run with: uvicorn backend.main:app --reload --port 8000
"""

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from backend.api.routes import upload, reconcile, export
from backend.api.routes.graph import router as graph_router
from backend.api.routes.suggestions import router as suggestions_router
from backend.api.routes.samples import router as samples_router
from backend.api.routes.health import router as health_router
from backend.api.errors import (
    ErrorCode, ErrorResponse,
    HTTP_STATUS_TO_ERROR_CODE,
    ValidationErrorDetail,
)
from backend.config import CORS_ORIGINS, DEBUG, API_V1_PREFIX, MAX_REQUEST_BYTES
from backend.logging_config import configure_logging
from backend.services.pipeline import periodic_job_cleanup

configure_logging(debug=DEBUG)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    cleanup_task = asyncio.create_task(periodic_job_cleanup())
    yield
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="SchemaSync",
    description="Zero-Config Cross-Product Data Model Reconciliation",
    version="0.1.0",
    debug=DEBUG,
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────

class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length exceeds MAX_REQUEST_BYTES before reading the body."""

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > MAX_REQUEST_BYTES:
            body = ErrorResponse(
                error=ErrorCode.FILE_TOO_LARGE.value,
                message=f"Request body too large (max {MAX_REQUEST_BYTES // (1024 * 1024)} MB)",
            ).model_dump(mode="json")
            return JSONResponse(status_code=413, content=body)
        return await call_next(request)


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a per-request UUID to request.state and echo it in the response header."""

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


app.add_middleware(RequestSizeLimitMiddleware)
app.add_middleware(RequestIDMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router,       prefix=API_V1_PREFIX)
app.include_router(reconcile.router,   prefix=API_V1_PREFIX)
app.include_router(export.router,      prefix=API_V1_PREFIX)
app.include_router(graph_router,       prefix=API_V1_PREFIX)
app.include_router(suggestions_router, prefix=API_V1_PREFIX)
app.include_router(samples_router,     prefix=API_V1_PREFIX)
app.include_router(health_router,      prefix=API_V1_PREFIX)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _json_error(
    status_code: int,
    code: ErrorCode,
    message: str,
    detail=None,
    request_id: str | None = None,
) -> JSONResponse:
    body = ErrorResponse(
        error=code.value,
        message=message,
        detail=detail,
        request_id=request_id,
    ).model_dump(mode="json")
    return JSONResponse(status_code=status_code, content=body)


# ── Global exception handlers ─────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    rid = _request_id(request)

    # Our own api_error() already built the structured dict — enrich with request_id.
    if isinstance(exc.detail, dict) and "error" in exc.detail and "message" in exc.detail:
        body = dict(exc.detail)
        body["request_id"] = rid
        return JSONResponse(status_code=exc.status_code, content=body)

    # Plain HTTPException raised elsewhere — map to our envelope.
    code = HTTP_STATUS_TO_ERROR_CODE.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
    return _json_error(exc.status_code, code, str(exc.detail), request_id=rid)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    return _json_error(
        422,
        ErrorCode.VALIDATION_ERROR,
        "Request validation failed",
        detail=ValidationErrorDetail(fields=exc.errors()).model_dump(mode="json"),
        request_id=_request_id(request),
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception",
        extra={"path": request.url.path, "exc": str(exc), "request_id": _request_id(request)},
        exc_info=True,
    )
    return _json_error(
        500,
        ErrorCode.INTERNAL_ERROR,
        "An unexpected error occurred",
        detail=str(exc) if DEBUG else None,
        request_id=_request_id(request),
    )


# ── Root ──────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "SchemaSync API", "docs": "/docs"}
