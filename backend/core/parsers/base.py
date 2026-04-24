"""
Base parser — abstract interface that all format-specific parsers implement.
"""

from abc import ABC, abstractmethod
from backend.core.ir.models import Schema


class BaseParser(ABC):
    """Every parser takes raw text and returns a Schema."""

    @abstractmethod
    def parse(self, content: str, schema_name: str = "") -> Schema:
        """Parse raw schema text into our IR."""
        ...

    @abstractmethod
    def can_parse(self, content: str) -> bool:
        """Quick sniff test — can this parser handle the given content?"""
        ...