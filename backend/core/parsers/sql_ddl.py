"""
SQL DDL Parser — parses CREATE TABLE statements into our IR.

Targets MySQL / MariaDB DDL (Ghost and WordPress both use MySQL).
Also handles basic PostgreSQL DDL.
"""

import re
from backend.core.parsers.base import BaseParser
from backend.core.ir.models import (
    Schema, Table, Column, Index, ForeignKey,
    ColumnType, ConstraintType, IndexType,
)
from backend.core.ir.normaliser import (
    normalise_name, normalise_type, extract_length,
    extract_precision_scale, extract_enum_values,
)


class SQLDDLParser(BaseParser):

    def can_parse(self, content: str) -> bool:
        return bool(re.search(r"CREATE\s+TABLE", content, re.I))

    def parse(self, content: str, schema_name: str = "") -> Schema:
        tables = []
        for raw_block in self._extract_create_blocks(content):
            table = self._parse_create_table(raw_block)
            if table:
                tables.append(table)

        return Schema(
            name=schema_name or "unnamed",
            source_format="sql_ddl",
            tables=tables,
        )

    # Block extraction 

    def _extract_create_blocks(self, content: str) -> list[str]:
        content = re.sub(r"--[^\n]*", "", content)
        content = re.sub(r"/\*.*?\*/", "", content, flags=re.S)
        content = re.sub(
            r"(?:SET|DROP|INSERT|USE|LOCK|UNLOCK|ALTER)\s+[^;]*;",
            "", content, flags=re.I
        )

        blocks = []
        pattern = re.compile(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
            r"[`\"\[]?\w+[`\"\]]?\s*\("
            , re.I
        )

        for m in pattern.finditer(content):
            start = m.start()
            depth = 0
            i = m.end() - 1
            while i < len(content):
                if content[i] == '(':
                    depth += 1
                elif content[i] == ')':
                    depth -= 1
                    if depth == 0:
                        end = content.find(';', i)
                        if end == -1:
                            end = len(content)
                        blocks.append(content[start:end + 1])
                        break
                i += 1

        return blocks

    # Table parsing 

    def _parse_create_table(self, block: str) -> Table | None:
        m = re.match(
            r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?"
            r"[`\"\[]?(\w+)[`\"\]]?\s*\(",
            block, re.I
        )
        if not m:
            return None

        raw_name = m.group(1)
        table = Table(
            name=normalise_name(raw_name),
            raw_name=raw_name,
        )

        body = self._extract_body(block)
        if not body:
            return None

        definitions = self._split_definitions(body)

        for defn in definitions:
            defn_stripped = defn.strip()
            if self._is_constraint(defn_stripped):
                continue
            col = self._parse_column(defn_stripped)
            if col:
                table.columns.append(col)

        for defn in definitions:
            defn_stripped = defn.strip()
            if not self._is_constraint(defn_stripped):
                continue
            self._apply_constraint(defn_stripped, table)

        self._parse_table_options(block, table)
        table.primary_key = [c.name for c in table.columns if c.is_primary_key]

        return table

    def _extract_body(self, block: str) -> str | None:
        first_paren = block.find('(')
        if first_paren == -1:
            return None

        depth = 0
        for i in range(first_paren, len(block)):
            if block[i] == '(':
                depth += 1
            elif block[i] == ')':
                depth -= 1
                if depth == 0:
                    return block[first_paren + 1:i]
        return None

    def _split_definitions(self, body: str) -> list[str]:
        parts = []
        depth = 0
        current = []

        for char in body:
            if char == '(':
                depth += 1
                current.append(char)
            elif char == ')':
                depth -= 1
                current.append(char)
            elif char == ',' and depth == 0:
                parts.append(''.join(current).strip())
                current = []
            else:
                current.append(char)

        if current:
            parts.append(''.join(current).strip())

        return [p for p in parts if p]

    # Column parsing

    def _parse_column(self, defn: str) -> Column | None:
        m = re.match(
            r"[`\"\[]?(\w+)[`\"\]]?\s+"
            r"(\w+(?:\s*\([^)]*\))?(?:\s+(?:unsigned|signed|zerofill))*)",
            defn, re.I
        )
        if not m:
            return None

        raw_name = m.group(1)
        raw_type = m.group(2).strip()
        rest = defn[m.end():].strip()

        col_type = normalise_type(raw_type)
        max_length = extract_length(raw_type)
        precision, scale = extract_precision_scale(raw_type)
        enum_values = extract_enum_values(raw_type) if col_type == ColumnType.ENUM else []

        col = Column(
            name=normalise_name(raw_name),
            raw_name=raw_name,
            col_type=col_type,
            raw_type=raw_type,
            max_length=max_length,
            precision=precision,
            scale=scale,
            enum_values=enum_values,
        )

        self._parse_column_constraints(rest, col)

        return col

    def _parse_column_constraints(self, rest: str, col: Column) -> None:
        upper = rest.upper()

        if "NOT NULL" in upper:
            col.nullable = False
            col.constraints.append(ConstraintType.NOT_NULL)
        elif "NULL" in upper and "NOT" not in upper:
            col.nullable = True

        if "PRIMARY KEY" in upper:
            col.is_primary_key = True
            col.nullable = False
            col.constraints.append(ConstraintType.PRIMARY_KEY)

        if re.search(r"\bUNIQUE\b", upper):
            col.is_unique = True
            col.constraints.append(ConstraintType.UNIQUE)

        if "AUTO_INCREMENT" in upper or "AUTOINCREMENT" in upper or "SERIAL" in upper:
            col.is_auto_increment = True

        dm = re.search(
            r"DEFAULT\s+('(?:[^'\\]|\\.)*'|\"(?:[^\"\\]|\\.)*\"|\S+)",
            rest, re.I
        )
        if dm:
            val = dm.group(1).strip("'\"")
            col.default_value = val
            col.constraints.append(ConstraintType.DEFAULT)

        rm = re.search(
            r"REFERENCES\s+[`\"\[]?(\w+)[`\"\]]?\s*\(\s*[`\"\[]?(\w+)[`\"\]]?\s*\)",
            rest, re.I
        )
        if rm:
            fk = ForeignKey(
                target_table=normalise_name(rm.group(1)),
                target_column=normalise_name(rm.group(2)),
            )
            self._parse_fk_actions(rest[rm.end():], fk)
            col.foreign_key = fk

        cm = re.search(r"COMMENT\s+'([^']*)'", rest, re.I)
        if cm:
            col.comment = cm.group(1)

    # Constraint parsing

    def _is_constraint(self, defn: str) -> bool:
        upper = defn.strip().upper()
        return bool(re.match(
            r"(PRIMARY\s+KEY|UNIQUE|INDEX|KEY|FOREIGN\s+KEY|CONSTRAINT|CHECK)\b",
            upper
        ))

    def _apply_constraint(self, defn: str, table: Table) -> None:
        upper = defn.upper()

        if re.match(r"(CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY", upper):
            cols = self._extract_column_list(defn)
            for cname in cols:
                col = table.get_column(normalise_name(cname))
                if col:
                    col.is_primary_key = True
                    col.nullable = False
                    if ConstraintType.PRIMARY_KEY not in col.constraints:
                        col.constraints.append(ConstraintType.PRIMARY_KEY)

        elif re.match(r"(CONSTRAINT\s+\w+\s+)?UNIQUE", upper):
            cols = self._extract_column_list(defn)
            idx_name = self._extract_constraint_name(defn) or f"uq_{'_'.join(cols)}"
            table.indexes.append(Index(
                name=normalise_name(idx_name),
                columns=[normalise_name(c) for c in cols],
                index_type=IndexType.UNIQUE,
                is_unique=True,
            ))
            for cname in cols:
                col = table.get_column(normalise_name(cname))
                if col:
                    col.is_unique = True

        elif re.match(r"(FULLTEXT\s+)?(INDEX|KEY)\b", upper):
            cols = self._extract_column_list(defn)
            idx_name = self._extract_index_name(defn) or f"idx_{'_'.join(cols)}"
            idx_type = IndexType.FULLTEXT if "FULLTEXT" in upper else IndexType.BTREE
            table.indexes.append(Index(
                name=normalise_name(idx_name),
                columns=[normalise_name(c) for c in cols],
                index_type=idx_type,
                is_unique=False,
            ))

        elif re.match(r"(CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY", upper):
            self._parse_foreign_key_constraint(defn, table)

    def _parse_foreign_key_constraint(self, defn: str, table: Table) -> None:
        m = re.search(
            r"FOREIGN\s+KEY\s*\(\s*[`\"\[]?(\w+)[`\"\]]?\s*\)\s*"
            r"REFERENCES\s+[`\"\[]?(\w+)[`\"\]]?\s*\(\s*[`\"\[]?(\w+)[`\"\]]?\s*\)",
            defn, re.I
        )
        if not m:
            return

        col_name = normalise_name(m.group(1))
        target_table = normalise_name(m.group(2))
        target_col = normalise_name(m.group(3))

        fk = ForeignKey(target_table=target_table, target_column=target_col)
        self._parse_fk_actions(defn[m.end():], fk)

        col = table.get_column(col_name)
        if col:
            col.foreign_key = fk

    def _parse_fk_actions(self, rest: str, fk: ForeignKey) -> None:
        del_m = re.search(r"ON\s+DELETE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)", rest, re.I)
        if del_m:
            fk.on_delete = del_m.group(1).upper().replace("  ", " ")

        upd_m = re.search(r"ON\s+UPDATE\s+(CASCADE|SET\s+NULL|SET\s+DEFAULT|RESTRICT|NO\s+ACTION)", rest, re.I)
        if upd_m:
            fk.on_update = upd_m.group(1).upper().replace("  ", " ")

    # Helpers 

    def _extract_column_list(self, defn: str) -> list[str]:
        m = re.search(r"\(\s*([^)]+)\)", defn)
        if not m:
            return []
        inner = m.group(1)
        cols = []
        for part in inner.split(','):
            clean = re.sub(r"[`\"\[\]\s]", "", part.strip())
            clean = re.sub(r"\(\d+\)", "", clean)
            clean = re.sub(r"\s+(ASC|DESC)$", "", clean, flags=re.I)
            if clean:
                cols.append(clean)
        return cols

    def _extract_constraint_name(self, defn: str) -> str | None:
        m = re.match(r"CONSTRAINT\s+[`\"\[]?(\w+)[`\"\]]?", defn, re.I)
        if m:
            return m.group(1)
        m = re.match(r"UNIQUE\s+(?:KEY|INDEX)\s+[`\"\[]?(\w+)[`\"\]]?", defn, re.I)
        if m:
            return m.group(1)
        return None

    def _extract_index_name(self, defn: str) -> str | None:
        m = re.match(
            r"(?:FULLTEXT\s+)?(?:INDEX|KEY)\s+[`\"\[]?(\w+)[`\"\]]?",
            defn, re.I
        )
        return m.group(1) if m else None

    def _parse_table_options(self, block: str, table: Table) -> None:
        depth = 0
        last_close = -1
        for i, c in enumerate(block):
            if c == '(':
                depth += 1
            elif c == ')':
                depth -= 1
                if depth == 0:
                    last_close = i
                    break

        if last_close == -1:
            return

        tail = block[last_close + 1:]

        em = re.search(r"ENGINE\s*=\s*(\w+)", tail, re.I)
        if em:
            table.engine = em.group(1)

        cm = re.search(r"(?:DEFAULT\s+)?CHARSET\s*=\s*(\w+)", tail, re.I)
        if cm:
            table.charset = cm.group(1)

        comm = re.search(r"COMMENT\s*=\s*'([^']*)'", tail, re.I)
        if comm:
            table.comment = comm.group(1)