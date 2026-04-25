"""
SchemaSync Backend — FastAPI application.

Run with: uvicorn backend.main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.api.routes import upload, reconcile, export
from backend.api.routes.health import router as health_router
from backend.api.errors import ErrorCode, ErrorResponse
from backend.config import CORS_ORIGINS, DEBUG

app = FastAPI(
    title="SchemaSync",
    description="Zero-Config Cross-Product Data Model Reconciliation",
    version="0.1.0",
    debug=DEBUG,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api")
app.include_router(reconcile.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(health_router, prefix="/api")


# ── Global exception handlers ────────────────────────────────────────────────

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    # If the detail is already our structured dict, pass it through unchanged.
    if isinstance(exc.detail, dict) and "error" in exc.detail and "message" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)

    # Otherwise wrap the plain string detail into our envelope.
    _status_to_code = {
        400: ErrorCode.VALIDATION_ERROR,
        404: ErrorCode.NOT_FOUND,
        405: ErrorCode.VALIDATION_ERROR,
        409: ErrorCode.VALIDATION_ERROR,
        413: ErrorCode.FILE_TOO_LARGE,
        422: ErrorCode.VALIDATION_ERROR,
        500: ErrorCode.INTERNAL_ERROR,
        503: ErrorCode.SERVICE_UNAVAILABLE,
    }
    code = _status_to_code.get(exc.status_code, ErrorCode.INTERNAL_ERROR)
    body = ErrorResponse(error=code.value, message=str(exc.detail)).model_dump()
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorCode.VALIDATION_ERROR.value,
        message="Request validation failed",
        detail=exc.errors(),
    ).model_dump()
    return JSONResponse(status_code=422, content=body)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    body = ErrorResponse(
        error=ErrorCode.INTERNAL_ERROR.value,
        message="An unexpected error occurred",
        detail=str(exc) if DEBUG else None,
    ).model_dump()
    return JSONResponse(status_code=500, content=body)


# ── Root ─────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"message": "SchemaSync API", "docs": "/docs"}
