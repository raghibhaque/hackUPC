"""
Configuration — all settings in one place.
"""

import os
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DEMO_DIR = BASE_DIR / "demo"
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

TABLE_MATCH_THRESHOLD = float(os.getenv("TABLE_MATCH_THRESHOLD", "0.35"))
COLUMN_MATCH_THRESHOLD = float(os.getenv("COLUMN_MATCH_THRESHOLD", "0.30"))
STRUCTURAL_WEIGHT = float(os.getenv("STRUCTURAL_WEIGHT", "0.45"))
SEMANTIC_WEIGHT = float(os.getenv("SEMANTIC_WEIGHT", "0.55"))

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
USE_EMBEDDINGS = os.getenv("USE_EMBEDDINGS", "false").lower() == "true"

MAX_UPLOAD_BYTES = int(os.getenv("MAX_UPLOAD_BYTES", str(2 * 1024 * 1024)))  # 2 MB
ALLOWED_EXTENSIONS = set(os.getenv("ALLOWED_EXTENSIONS", ".sql,.prisma,.json").split(","))