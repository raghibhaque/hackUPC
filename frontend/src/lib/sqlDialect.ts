/**
 * SQL Dialect Adapter — handles MySQL vs PostgreSQL syntax differences
 */

export type SQLDialect = 'mysql' | 'postgresql' | 'generic'

export interface SQLDialectAdapter {
  renameTable(oldName: string, newName: string): string
  renameColumn(tableName: string, oldName: string, newName: string): string
  alterColumnType(tableName: string, colName: string, newType: string): string
  addColumn(tableName: string, colName: string, colDef: string): string
  dropColumn(tableName: string, colName: string): string
  dropTable(tableName: string): string
  autoIncrementKeyword: string
  booleanType: string
  uuidType: string
  castExpression(colName: string, toType: string): string
}

const mysqlAdapter: SQLDialectAdapter = {
  renameTable: (old, new_) => `RENAME TABLE ${old} TO ${new_}`,
  renameColumn: (tbl, old, new_) => `ALTER TABLE ${tbl} RENAME COLUMN ${old} TO ${new_}`,
  alterColumnType: (tbl, col, type) => `ALTER TABLE ${tbl} MODIFY COLUMN ${col} ${type}`,
  addColumn: (tbl, col, def) => `ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}`,
  dropColumn: (tbl, col) => `ALTER TABLE ${tbl} DROP COLUMN ${col}`,
  dropTable: (tbl) => `DROP TABLE IF EXISTS ${tbl} CASCADE`,
  autoIncrementKeyword: 'AUTO_INCREMENT',
  booleanType: 'BOOLEAN',
  uuidType: 'CHAR(36)',
  castExpression: (col, type) => `CAST(${col} AS ${type})`,
}

const postgresAdapter: SQLDialectAdapter = {
  renameTable: (old, new_) => `ALTER TABLE ${old} RENAME TO ${new_}`,
  renameColumn: (tbl, old, new_) => `ALTER TABLE ${tbl} RENAME COLUMN ${old} TO ${new_}`,
  alterColumnType: (tbl, col, type) => `ALTER TABLE ${tbl} ALTER COLUMN ${col} TYPE ${type}`,
  addColumn: (tbl, col, def) => `ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}`,
  dropColumn: (tbl, col) => `ALTER TABLE ${tbl} DROP COLUMN ${col}`,
  dropTable: (tbl) => `DROP TABLE IF EXISTS ${tbl} CASCADE`,
  autoIncrementKeyword: 'SERIAL',
  booleanType: 'BOOLEAN',
  uuidType: 'UUID',
  castExpression: (col, type) => `CAST(${col} AS ${type})`,
}

const genericAdapter: SQLDialectAdapter = {
  renameTable: (old, new_) => `-- RENAME TABLE ${old} TO ${new_}; /* dialect-specific */`,
  renameColumn: (tbl, old, new_) => `-- ALTER TABLE ${tbl} RENAME COLUMN ${old} TO ${new_}; /* dialect-specific */`,
  alterColumnType: (tbl, col, type) => `-- ALTER TABLE ${tbl} MODIFY COLUMN ${col} ${type}; /* dialect-specific */`,
  addColumn: (tbl, col, def) => `-- ALTER TABLE ${tbl} ADD COLUMN ${col} ${def}; /* dialect-specific */`,
  dropColumn: (tbl, col) => `-- ALTER TABLE ${tbl} DROP COLUMN ${col}; /* dialect-specific */`,
  dropTable: (tbl) => `-- DROP TABLE ${tbl}; /* dialect-specific */`,
  autoIncrementKeyword: 'AUTO_INCREMENT',
  booleanType: 'BOOLEAN',
  uuidType: 'CHAR(36)',
  castExpression: (col, type) => `CAST(${col} AS ${type})`,
}

export function getDialectAdapter(dialect: SQLDialect): SQLDialectAdapter {
  switch (dialect) {
    case 'mysql':
      return mysqlAdapter
    case 'postgresql':
      return postgresAdapter
    case 'generic':
    default:
      return genericAdapter
  }
}

export const DIALECT_LABELS: Record<SQLDialect, string> = {
  mysql: 'MySQL',
  postgresql: 'PostgreSQL',
  generic: 'Generic SQL',
}

export const DIALECT_DESCRIPTIONS: Record<SQLDialect, string> = {
  mysql: 'MySQL 5.7+ / MariaDB 10.3+',
  postgresql: 'PostgreSQL 11+',
  generic: 'Platform-agnostic (requires manual dialect fixes)',
}
