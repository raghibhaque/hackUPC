"""
Parse-result cache keyed by content hash + parser type.

Identical schema text parsed with the same parser returns the cached
Schema object instead of re-running the full parse pipeline.
"""

from __future__ import annotations

import hashlib
import threading
from typing import Callable, Optional

from backend.core.ir.models import Schema

_lock = threading.Lock()
_cache: dict[str, Schema] = {}
_MAX_ENTRIES = 256


def _evict_if_full() -> None:
    if len(_cache) >= _MAX_ENTRIES:
        oldest = next(iter(_cache))
        del _cache[oldest]


def _key(text: str, parser_tag: str) -> str:
    digest = hashlib.sha256(text.encode()).hexdigest()
    return f"{parser_tag}:{digest}"


def get_or_parse(
    text: str,
    parser_tag: str,
    parse_fn: Callable[[str], Schema],
) -> Schema:
    """Return a cached Schema or invoke parse_fn and cache the result."""
    k = _key(text, parser_tag)
    with _lock:
        if k in _cache:
            return _cache[k]
    schema = parse_fn(text)
    with _lock:
        _evict_if_full()
        _cache[k] = schema
    return schema


def cache_size() -> int:
    with _lock:
        return len(_cache)


def clear_cache() -> None:
    with _lock:
        _cache.clear()
