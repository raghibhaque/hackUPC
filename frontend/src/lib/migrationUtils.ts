/**
 * Migration Utilities — SQL builders and type conversion helpers
 */

import type { TableMapping, ReconciliationResult, Column } from '../types'

export const TYPE_CONVERSION_MAP: Record<string, Record<string, string>> = {
  varchar: {
    int: "CAST(NULLIF(TRIM(??), '') AS SIGNED)",
    bigint: "CAST(NULLIF(TRIM(??), '') AS BIGINT)",
    decimal: "CAST(NULLIF(TRIM(??), '') AS DECIMAL(10,2))",
    float: "CAST(NULLIF(TRIM(??), '') AS FLOAT)",
    double: "CAST(NULLIF(TRIM(??), '') AS DOUBLE)",
    date: "STR_TO_DATE(NULLIF(TRIM(??), ''), '%Y-%m-%d')",
    datetime: "STR_TO_DATE(NULLIF(TRIM(??), ''), '%Y-%m-%d %H:%i:%s')",
    timestamp: "STR_TO_DATE(NULLIF(TRIM(??), ''), '%Y-%m-%d %H:%i:%s')",
    boolean: "CASE WHEN LOWER(NULLIF(TRIM(??), '')) IN ('true','yes','1','t','y') THEN 1 ELSE 0 END",
  },
  text: {
    int: "CAST(NULLIF(TRIM(??), '') AS SIGNED)",
    bigint: "CAST(NULLIF(TRIM(??), '') AS BIGINT)",
    float: "CAST(NULLIF(TRIM(??), '') AS FLOAT)",
    double: "CAST(NULLIF(TRIM(??), '') AS DOUBLE)",
  },
  int: {
    varchar: "CAST(?? AS VARCHAR(255))",
    text: "CAST(?? AS TEXT)",
    decimal: "CAST(?? AS DECIMAL(10,2))",
    float: "CAST(?? AS FLOAT)",
    double: "CAST(?? AS DOUBLE)",
    datetime: "FROM_UNIXTIME(??)",
    timestamp: "FROM_UNIXTIME(??)",
  },
  bigint: {
    varchar: "CAST(?? AS VARCHAR(255))",
    text: "CAST(?? AS TEXT)",
    int: "CAST(?? AS INT)",
    decimal: "CAST(?? AS DECIMAL(10,2))",
  },
  datetime: {
    varchar: "DATE_FORMAT(??, '%Y-%m-%d %H:%i:%s')",
    text: "DATE_FORMAT(??, '%Y-%m-%d %H:%i:%s')",
    date: "CAST(?? AS DATE)",
    timestamp: "CAST(?? AS TIMESTAMP)",
  },
  timestamp: {
    varchar: "DATE_FORMAT(??, '%Y-%m-%d %H:%i:%s')",
    text: "DATE_FORMAT(??, '%Y-%m-%d %H:%i:%s')",
    date: "CAST(?? AS DATE)",
    datetime: "CAST(?? AS DATETIME)",
  },
  date: {
    varchar: "DATE_FORMAT(??, '%Y-%m-%d')",
    text: "DATE_FORMAT(??, '%Y-%m-%d')",
    datetime: "CAST(?? AS DATETIME)",
    timestamp: "CAST(?? AS TIMESTAMP)",
  },
}

export function getTypeConversionSQL(srcType: string, tgtType: string, colName: string): string {
  const srcLower = srcType.toLowerCase()
  const tgtLower = tgtType.toLowerCase()

  const conversion = TYPE_CONVERSION_MAP[srcLower]?.[tgtLower]
  if (conversion) {
    return conversion.replace(/\?\?/g, colName)
  }

  // Fallback to basic CAST
  return `CAST(${colName} AS ${tgtType.toUpperCase()})`
}

export function isRiskyConversion(srcType: string, tgtType: string): boolean {
  const srcLower = srcType.toLowerCase()
  const tgtLower = tgtType.toLowerCase()

  // Risky conversions that can cause data loss
  const riskyPairs = [
    ['varchar', 'int'],
    ['varchar', 'bigint'],
    ['varchar', 'float'],
    ['text', 'int'],
    ['text', 'decimal'],
    ['datetime', 'int'],
    ['timestamp', 'int'],
    ['text', 'datetime'],
  ]

  return riskyPairs.some(([s, t]) => srcLower.includes(s) && tgtLower.includes(t))
}

export function buildColumnDDL(col: Column): string {
  const parts: string[] = [col.name]

  // Add type
  const typeStr = col.data_type?.base_type || 'TEXT'
  parts.push(typeStr)

  return parts.join(' ')
}

export function buildAddColumnSQL(tableName: string, col: Column): string {
  return `ALTER TABLE ${tableName} ADD COLUMN ${buildColumnDDL(col)};`
}

export function buildDropColumnSQL(tableName: string, colName: string): string {
  return `ALTER TABLE ${tableName} DROP COLUMN ${colName};`
}

export function buildRenameColumnSQL(tableName: string, oldName: string, newName: string): string {
  return `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName};`
}

export function buildAlterColumnTypeSQL(tableName: string, colName: string, newType: string, dialect: string = 'mysql'): string {
  if (dialect === 'postgresql') {
    return `ALTER TABLE ${tableName} ALTER COLUMN ${colName} TYPE ${newType};`
  }
  // MySQL/generic
  return `ALTER TABLE ${tableName} MODIFY COLUMN ${colName} ${newType};`
}

export function buildCreateTableSQL(tableMapping: TableMapping): string {
  const lines: string[] = []
  lines.push(`CREATE TABLE IF NOT EXISTS ${tableMapping.table_b.name} (`)

  const colDefs = tableMapping.table_b.columns.map((col) => {
    const parts = [`    ${col.name}`, col.data_type?.base_type || 'TEXT']
    return parts.join(' ')
  })

  lines.push(colDefs.join(',\n'))
  lines.push(');')

  return lines.join('\n')
}

export function buildInsertSelectSQL(tableMapping: TableMapping): string {
  const lines: string[] = []

  const targetCols: string[] = []
  const sourceExprs: string[] = []

  for (const cm of tableMapping.column_mappings) {
    targetCols.push(cm.col_b.name)

    if (cm.col_a.data_type?.base_type === cm.col_b.data_type?.base_type) {
      sourceExprs.push(cm.col_a.name)
    } else {
      const castExpr = getTypeConversionSQL(cm.col_a.data_type?.base_type || 'TEXT', cm.col_b.data_type?.base_type || 'TEXT', cm.col_a.name)
      sourceExprs.push(castExpr)
    }
  }

  lines.push(`INSERT INTO ${tableMapping.table_b.name} (`)
  lines.push(`    ${targetCols.join(', ')}`)
  lines.push(`)`)
  lines.push(`SELECT`)
  for (let i = 0; i < sourceExprs.length; i++) {
    const comma = i < sourceExprs.length - 1 ? ',' : ''
    lines.push(`    ${sourceExprs[i]}${comma}`)
  }
  lines.push(`FROM ${tableMapping.table_a.name};`)

  return lines.join('\n')
}

export function buildRollbackSQL(tableMapping: TableMapping): string {
  const lines: string[] = []

  // Rename columns back
  for (const cm of tableMapping.column_mappings) {
    if (cm.col_a.name !== cm.col_b.name) {
      lines.push(`ALTER TABLE ${tableMapping.table_a.name} RENAME COLUMN ${cm.col_b.name} TO ${cm.col_a.name};`)
    }
  }

  return lines.join('\n')
}

export interface MigrationComplexity {
  score: number
  label: 'simple' | 'moderate' | 'complex'
  reasons: string[]
}

export function estimateMigrationComplexity(result: ReconciliationResult): MigrationComplexity {
  const reasons: string[] = []
  let score = 0

  // Count risky type conversions
  let riskyCount = 0
  for (const tm of result.table_mappings || []) {
    for (const cm of tm.column_mappings) {
      if (isRiskyConversion(cm.col_a.data_type?.base_type || '', cm.col_b.data_type?.base_type || '')) {
        riskyCount++
        score += 3
      }
    }
  }

  if (riskyCount > 0) {
    reasons.push(`${riskyCount} risky type conversion${riskyCount > 1 ? 's' : ''}`)
  }

  // Count unmatched columns
  let unmatchedCount = 0
  for (const tm of result.table_mappings || []) {
    unmatchedCount += (tm.unmatched_columns_a?.length || 0) + (tm.unmatched_columns_b?.length || 0)
  }

  if (unmatchedCount > 0) {
    score += unmatchedCount * 2
    reasons.push(`${unmatchedCount} unmatched columns requiring manual resolution`)
  }

  // Count low-confidence mappings
  let lowConfCount = 0
  for (const tm of result.table_mappings || []) {
    if (tm.confidence < 0.7) {
      lowConfCount++
      score += 1
    }
  }

  if (lowConfCount > 0) {
    reasons.push(`${lowConfCount} low-confidence table mapping${lowConfCount > 1 ? 's' : ''}`)
  }

  // Check for conflicts
  const errorConflicts = (result.summary?.critical_conflicts || 0)
  if (errorConflicts > 0) {
    score += errorConflicts * 5
    reasons.push(`${errorConflicts} critical conflict${errorConflicts > 1 ? 's' : ''} to resolve`)
  }

  // Determine label
  let label: 'simple' | 'moderate' | 'complex'
  if (score <= 3) {
    label = 'simple'
  } else if (score <= 10) {
    label = 'moderate'
  } else {
    label = 'complex'
  }

  return { score, label, reasons }
}

export function annotateWithConflicts(sql: string, conflicts: any[] = []): string {
  if (!conflicts || conflicts.length === 0) {
    return sql
  }

  const lines = sql.split('\n')
  const annotated: string[] = []

  for (const line of lines) {
    // Look for risky CAST patterns
    if (line.includes('CAST') && (line.includes('VARCHAR') || line.includes('TEXT'))) {
      if (line.includes('INT') || line.includes('DECIMAL')) {
        annotated.push(`-- ⚠ RISK: Potential data loss in type conversion`)
      }
    }

    // Add conflict annotations
    for (const conflict of conflicts) {
      if (conflict.source_column && line.includes(conflict.source_column)) {
        annotated.push(`-- ⚠ CONFLICT: ${conflict.description || 'Please review this mapping'}`)
        break
      }
    }

    annotated.push(line)
  }

  return annotated.join('\n')
}
