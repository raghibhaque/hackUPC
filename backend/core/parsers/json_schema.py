"""
JSON Schema Parser — parses JSON Schema documents into our IR.

Supported patterns (tried in order):
  1. $defs / definitions — each object-typed entry becomes a Table
  2. Single object schema — root has type:"object" + properties → one Table
  3. Top-level keyed map — root keys whose values are object schemas → Tables

Column type mapping:
  integer               → INTEGER
  number                → FLOAT (or DECIMAL with format:"decimal")
  boolean               → BOOLEAN
  string (default)      → TEXT  (or VARCHAR when maxLength is set)
  string + date-time    → TIMESTAMP
  string + date         → DATE
  string + time         → TIME
  string + uuid         → UUID
  object (inline)       → JSON
  array                 → skipped
  $ref → object schema  → skipped (relation); FK attached to matching *Id field
  enum values present   → ENUM
"""

import json
import re
from backend.core.parsers.base import BaseParser
from backend.core.ir.models import (
    Schema, Table, Column, ForeignKey,
    ColumnType, ConstraintType,
)
from backend.core.ir.normaliser import normalise_name

# JSON Schema root-level meta-keys — not tables
_META_KEYS = frozenset({
    "$schema", "$id", "$ref", "$comment",
    "title", "description", "type",
    "$defs", "definitions",
    "allOf", "anyOf", "oneOf", "not",
    "if", "then", "else",
    "required", "properties",
})


class JSONSchemaParser(BaseParser):

    def can_parse(self, content: str) -> bool:
        try:
            data = json.loads(content.strip())
        except (json.JSONDecodeError, ValueError):
            return False
        if not isinstance(data, dict):
            return False
        return (
            "properties" in data
            or "$defs" in data
            or "definitions" in data
        )

    def parse(self, content: str, schema_name: str = "") -> Schema:
        data = json.loads(content.strip())
        defs = {**data.get("$defs", {}), **data.get("definitions", {})}

        tables: list[Table] = []

        # Pattern 1 — definitions / $defs
        for def_name, def_schema in defs.items():
            if self._is_object_schema(def_schema):
                table = self._parse_object_schema(def_name, def_schema, defs)
                if table:
                    tables.append(table)

        # Pattern 2 — root is itself an object schema (single-table document)
        if not tables and self._is_object_schema(data):
            name = data.get("title") or schema_name or "schema"
            table = self._parse_object_schema(name, data, defs)
            if table:
                tables.append(table)

        # Pattern 3 — top-level keys are object schemas (multi-table map)
        if not tables:
            for key, value in data.items():
                if key not in _META_KEYS and self._is_object_schema(value):
                    table = self._parse_object_schema(key, value, defs)
                    if table:
                        tables.append(table)

        return Schema(
            name=schema_name or data.get("title") or "unnamed",
            source_format="json_schema",
            tables=tables,
        )

    # ── Object schema → Table ───────────────────────────────────────────────

    def _parse_object_schema(
        self, raw_name: str, schema: dict, defs: dict
    ) -> Table | None:
        table = Table(
            name=normalise_name(raw_name),
            raw_name=raw_name,
            comment=schema.get("description"),
        )

        required_fields: set[str] = set(schema.get("required", []))
        properties: dict = schema.get("properties", {})

        # First pass — collect relation $refs so we can attach FKs to scalar fields
        # e.g. "author": {"$ref": "#/$defs/User"}  →  authorId → FK(user, id)
        ref_relations: dict[str, str] = {}  # prop_name → target model name
        for prop_name, prop_schema in properties.items():
            if not isinstance(prop_schema, dict):
                continue
            target = self._ref_to_object_model(prop_schema, defs)
            if target:
                ref_relations[prop_name] = target

        # Second pass — build columns
        for prop_name, prop_schema in properties.items():
            if not isinstance(prop_schema, dict):
                continue
            # Skip pure relation fields (will be represented via FK on scalar field)
            if prop_name in ref_relations:
                continue

            is_required = prop_name in required_fields
            col = self._parse_property(prop_name, prop_schema, is_required, defs)
            if col is None:
                continue

            # Attach FK if this scalar field matches a relation by name heuristic
            fk_target = self._infer_fk_target(prop_name, prop_schema, ref_relations)
            if fk_target:
                col.foreign_key = ForeignKey(
                    target_table=normalise_name(fk_target),
                    target_column="id",
                )

            table.columns.append(col)

        table.primary_key = [c.name for c in table.columns if c.is_primary_key]
        return table if table.columns else None

    # ── Property → Column ───────────────────────────────────────────────────

    def _parse_property(
        self, raw_name: str, prop: dict, required: bool, defs: dict
    ) -> Column | None:
        # Resolve $ref (for inline references that aren't pure model refs)
        if "$ref" in prop and len(prop) == 1:
            resolved = self._resolve_ref(prop["$ref"], defs)
            if resolved is None:
                return None
            if self._is_object_schema(resolved):
                # Pure object reference — skip (handled via ref_relations)
                return None
            prop = resolved

        json_type, nullable = self._extract_type(prop, required)

        if json_type == "array":
            return None

        fmt = prop.get("format", "")
        max_length = prop.get("maxLength")
        description = prop.get("description")
        default = prop.get("default")
        enum_vals: list = prop.get("enum", [])

        col_type, raw_type = self._map_type(json_type, fmt, max_length, enum_vals)
        if col_type is None:
            return None

        col = Column(
            name=normalise_name(raw_name),
            raw_name=raw_name,
            col_type=col_type,
            raw_type=raw_type,
            nullable=nullable,
            max_length=max_length,
            comment=description,
            enum_values=enum_vals,
        )

        if not nullable:
            col.constraints.append(ConstraintType.NOT_NULL)

        if default is not None:
            col.default_value = str(default)
            col.constraints.append(ConstraintType.DEFAULT)

        # x-primary-key extension OR field named exactly "id" with integer type
        if prop.get("x-primary-key") or (
            raw_name.lower() == "id"
            and col_type in (ColumnType.INTEGER, ColumnType.BIGINT, ColumnType.UUID)
        ):
            col.is_primary_key = True
            col.nullable = False
            if ConstraintType.NOT_NULL not in col.constraints:
                col.constraints.append(ConstraintType.NOT_NULL)
            col.constraints.append(ConstraintType.PRIMARY_KEY)
            if col_type in (ColumnType.INTEGER, ColumnType.BIGINT):
                col.is_auto_increment = True

        if prop.get("x-unique"):
            col.is_unique = True
            col.constraints.append(ConstraintType.UNIQUE)

        return col

    # ── Type resolution helpers ─────────────────────────────────────────────

    def _extract_type(self, prop: dict, required: bool) -> tuple[str | None, bool]:
        """Return (json_type_string, nullable)."""
        json_type = prop.get("type")
        nullable = not required

        if isinstance(json_type, list):
            non_null = [t for t in json_type if t != "null"]
            if "null" in json_type:
                nullable = True
            json_type = non_null[0] if non_null else None

        # anyOf/oneOf with null → nullable
        for combiner in ("anyOf", "oneOf"):
            if combiner in prop:
                sub_types = prop[combiner]
                non_null_schemas = [s for s in sub_types if s.get("type") != "null"]
                if len(sub_types) > len(non_null_schemas):
                    nullable = True
                if len(non_null_schemas) == 1:
                    json_type = json_type or non_null_schemas[0].get("type")

        return json_type, nullable

    def _map_type(
        self,
        json_type: str | None,
        fmt: str,
        max_length: int | None,
        enum_vals: list,
    ) -> tuple[ColumnType | None, str]:
        if enum_vals:
            return ColumnType.ENUM, "enum"

        if json_type == "integer":
            return ColumnType.INTEGER, "integer"

        if json_type == "number":
            if fmt in ("decimal", "money"):
                return ColumnType.DECIMAL, "decimal"
            return ColumnType.FLOAT, "float"

        if json_type == "boolean":
            return ColumnType.BOOLEAN, "boolean"

        if json_type == "object":
            return ColumnType.JSON, "json"

        if json_type == "string":
            if fmt in ("date-time", "datetime"):
                return ColumnType.TIMESTAMP, "timestamp"
            if fmt == "date":
                return ColumnType.DATE, "date"
            if fmt == "time":
                return ColumnType.TIME, "time"
            if fmt == "uuid":
                return ColumnType.UUID, "uuid"
            if max_length:
                return ColumnType.VARCHAR, f"varchar({max_length})"
            return ColumnType.TEXT, "text"

        if json_type is None:
            return ColumnType.UNKNOWN, "unknown"

        return ColumnType.UNKNOWN, str(json_type)

    # ── $ref / FK helpers ───────────────────────────────────────────────────

    def _resolve_ref(self, ref: str, defs: dict) -> dict | None:
        """Resolve #/$defs/Name and #/definitions/Name references."""
        if not ref.startswith("#/"):
            return None
        parts = ref.lstrip("#/").split("/")
        if len(parts) == 2 and parts[0] in ("$defs", "definitions"):
            return defs.get(parts[1])
        return None

    def _ref_to_object_model(self, prop: dict, defs: dict) -> str | None:
        """If prop is a pure $ref pointing to an object schema, return the model name."""
        if "$ref" not in prop or len(prop) != 1:
            return None
        ref = prop["$ref"]
        m = re.match(r"^#/(?:\$defs|definitions)/(\w+)$", ref)
        if not m:
            return None
        target_name = m.group(1)
        target_schema = defs.get(target_name, {})
        if self._is_object_schema(target_schema):
            return target_name
        return None

    def _infer_fk_target(
        self, prop_name: str, prop: dict, ref_relations: dict[str, str]
    ) -> str | None:
        """Return the related model name if this scalar field looks like a FK.

        Matches patterns like:
          userId / user_id  →  relation field "user" exists in ref_relations
          authorId          →  relation field "author" exists
        """
        lower = prop_name.lower()

        # Strip trailing "id" or "_id"
        if lower.endswith("_id"):
            base = lower[:-3]
        elif lower.endswith("id") and len(lower) > 2:
            base = lower[:-2]
        else:
            return None

        # Check if a relation field with that base name exists
        for rel_name, target in ref_relations.items():
            if rel_name.lower() == base:
                return target

        return None

    # ── Utility ─────────────────────────────────────────────────────────────

    @staticmethod
    def _is_object_schema(schema) -> bool:
        return (
            isinstance(schema, dict)
            and schema.get("type") == "object"
            and "properties" in schema
        )
