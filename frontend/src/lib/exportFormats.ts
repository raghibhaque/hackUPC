import type { ReconciliationResult } from '../types'
import { estimateMigrationComplexity } from './migrationUtils'

function getMetadataHeader(result: ReconciliationResult): string[] {
  const complexity = estimateMigrationComplexity(result)
  const columnCount = result.summary.columns_matched || 0
  const lines: string[] = [
    '-- ═══════════════════════════════════════════════════════════',
    `-- SchemaSync Migration: ${result.summary.tables_matched} tables${columnCount > 0 ? `, ${columnCount} columns` : ''}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Confidence: ${(result.summary.average_confidence * 100).toFixed(1)}%`,
    `-- Complexity: ${complexity.label.toUpperCase()} (${complexity.reasons.join('; ')})`,
    `-- Conflicts: ${result.summary.total_conflicts}`,
    '-- ═══════════════════════════════════════════════════════════',
    '',
  ]
  return lines
}

export function generateGenericSQL(result: ReconciliationResult): string {
  // Prefer backend-generated migration_scaffold if available
  if (result.migration_scaffold) {
    return getMetadataHeader(result).join('\n') + result.migration_scaffold
  }

  // Fallback: generate from scratch
  const lines = [...getMetadataHeader(result)]

  lines.push('BEGIN;')
  lines.push('')

  // Generate actual migrations
  result.table_mappings?.forEach((mapping) => {
    lines.push(`-- ─── ${mapping.table_a.name} → ${mapping.table_b.name} (${(mapping.confidence * 100).toFixed(0)}%) ───`)
    lines.push('')

    // Column renames
    mapping.column_mappings?.forEach((cm) => {
      if (cm.col_a.name !== cm.col_b.name) {
        lines.push(`ALTER TABLE ${mapping.table_b.name} RENAME COLUMN ${cm.col_a.name} TO ${cm.col_b.name};`)
      }
    })

    // Type changes
    mapping.column_mappings?.forEach((cm) => {
      const srcType = cm.col_a.data_type?.base_type || 'TEXT'
      const tgtType = cm.col_b.data_type?.base_type || 'TEXT'
      if (srcType !== tgtType) {
        lines.push(`ALTER TABLE ${mapping.table_b.name} MODIFY COLUMN ${cm.col_b.name} ${tgtType};`)
      }
    })

    // New columns
    mapping.unmatched_columns_b?.forEach((col) => {
      const colType = col.data_type?.base_type || 'TEXT'
      lines.push(`ALTER TABLE ${mapping.table_b.name} ADD COLUMN ${col.name} ${colType};`)
    })

    lines.push('')
  })

  lines.push('COMMIT;')
  return lines.join('\n')
}

export function generateFlywaySQL(result: ReconciliationResult): string {
  const timestamp = new Date()
  const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '')
  const timeStr = timestamp.toTimeString().split(' ')[0].replace(/:/g, '')
  const version = `V${dateStr}.${timeStr}`

  const columnCount = result.summary.columns_matched || 0
  const lines: string[] = [
    `-- ${version} | SchemaSync Migration`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Tables: ${result.summary.tables_matched}${columnCount > 0 ? `, Columns: ${columnCount}` : ''}`,
    '',
  ]

  // Use backend migration SQL if available
  if (result.migration_scaffold) {
    lines.push(result.migration_scaffold)
  } else {
    lines.push('BEGIN;')
    result.table_mappings?.forEach((tm) => {
      lines.push(`-- ${tm.table_a.name} → ${tm.table_b.name}`)
      tm.column_mappings?.forEach((cm) => {
        if (cm.col_a.name !== cm.col_b.name) {
          lines.push(`ALTER TABLE ${tm.table_b.name} RENAME COLUMN ${cm.col_a.name} TO ${cm.col_b.name};`)
        }
      })
    })
    lines.push('COMMIT;')
  }

  lines.push('')
  lines.push('-- @undo')
  lines.push('-- ROLLBACK;')

  return lines.join('\n')
}

export function generateLiquibaseXML(result: ReconciliationResult): string {
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<databaseChangeLog',
    '  xmlns="http://www.liquibase.org/xml/ns/dbchangelog"',
    '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '  xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-latest.xsd">',
    '',
    `  <!-- Generated: ${new Date().toISOString()} -->`,
    `  <!-- Tables: ${result.summary.tables_matched}, Confidence: ${(result.summary.average_confidence * 100).toFixed(1)}% -->`,
    '',
  ]

  result.table_mappings?.forEach((tm, idx) => {
    lines.push(`  <changeSet id="schemasync-${idx}" author="schemasync">`)
    lines.push(`    <comment>Migrate ${tm.table_a.name} → ${tm.table_b.name}</comment>`)

    // Rename columns
    tm.column_mappings?.forEach((cm) => {
      if (cm.col_a.name !== cm.col_b.name) {
        lines.push(`    <renameColumn tableName="${tm.table_b.name}" oldColumnName="${cm.col_a.name}" newColumnName="${cm.col_b.name}"/>`)
      }
    })

    // Modify types
    tm.column_mappings?.forEach((cm) => {
      const srcType = cm.col_a.data_type?.base_type || 'TEXT'
      const tgtType = cm.col_b.data_type?.base_type || 'TEXT'
      if (srcType !== tgtType) {
        lines.push(`    <modifyDataType tableName="${tm.table_b.name}" columnName="${cm.col_b.name}" newDataType="${tgtType}"/>`)
      }
    })

    // Add columns
    tm.unmatched_columns_b?.forEach((col) => {
      const colType = col.data_type?.base_type || 'TEXT'
      lines.push(`    <addColumn tableName="${tm.table_b.name}"><column name="${col.name}" type="${colType}" /></addColumn>`)
    })

    lines.push(`  </changeSet>`)
    lines.push('')
  })

  lines.push('</databaseChangeLog>')
  return lines.join('\n')
}

export function generateDMSJSON(result: ReconciliationResult): string {
  const mapping = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    summary: result.summary,
    table_mappings: result.table_mappings?.map((tm) => ({
      source_table: tm.table_a.name,
      target_table: tm.table_b.name,
      confidence: tm.confidence,
      column_mappings: tm.column_mappings?.map((cm) => ({
        source_column: cm.col_a.name,
        source_type: cm.col_a.data_type?.base_type,
        target_column: cm.col_b.name,
        target_type: cm.col_b.data_type?.base_type,
        confidence: cm.confidence,
      })) || [],
      unmatched_source: tm.unmatched_columns_a?.map((c) => c.name) || [],
      unmatched_target: tm.unmatched_columns_b?.map((c) => c.name) || [],
    })) || [],
    migration_sql: result.migration_scaffold || null,
  }

  return JSON.stringify(mapping, null, 2)
}

export function generateRollbackSQL(result: ReconciliationResult): string {
  if (result.rollback_sql) {
    return result.rollback_sql
  }

  const lines: string[] = [
    '-- ═══════════════════════════════════════════════════════════',
    '-- ROLLBACK SCRIPT - Undo Migration',
    `-- Generated: ${new Date().toISOString()}`,
    '-- ═══════════════════════════════════════════════════════════',
    '',
    'BEGIN;',
    '',
  ]

  // Generate reverse operations
  result.table_mappings?.forEach((tm) => {
    lines.push(`-- Rollback ${tm.table_b.name} → ${tm.table_a.name}`)

    // Reverse column renames
    tm.column_mappings?.forEach((cm) => {
      if (cm.col_a.name !== cm.col_b.name) {
        lines.push(`ALTER TABLE ${tm.table_a.name} RENAME COLUMN ${cm.col_b.name} TO ${cm.col_a.name};`)
      }
    })

    // Reverse type changes
    tm.column_mappings?.forEach((cm) => {
      const srcType = cm.col_a.data_type?.base_type || 'TEXT'
      const tgtType = cm.col_b.data_type?.base_type || 'TEXT'
      if (srcType !== tgtType) {
        lines.push(`ALTER TABLE ${tm.table_a.name} MODIFY COLUMN ${cm.col_a.name} ${srcType};`)
      }
    })

    // Drop added columns
    tm.unmatched_columns_b?.forEach((col) => {
      lines.push(`ALTER TABLE ${tm.table_a.name} DROP COLUMN ${col.name};`)
    })

    lines.push('')
  })

  // Drop new tables
  result.unmatched_tables_b?.forEach((tbl) => {
    lines.push(`DROP TABLE IF EXISTS ${tbl} CASCADE;`)
  })

  lines.push('')
  lines.push('COMMIT;')
  return lines.join('\n')
}

export interface ExportFormat {
  id: string
  name: string
  filename: string
  mimeType: string
  generator: (result: ReconciliationResult) => string
  description?: string
}

export const EXPORT_FORMATS: ExportFormat[] = [
  {
    id: 'generic-sql',
    name: 'Generic SQL',
    filename: 'schemasync-migration.sql',
    mimeType: 'text/plain',
    generator: generateGenericSQL,
    description: 'Standard SQL with BEGIN/COMMIT transaction wrapper',
  },
  {
    id: 'flyway-sql',
    name: 'Flyway Migration',
    filename: 'schemasync-flyway-V1__schema_mapping.sql',
    mimeType: 'text/plain',
    generator: generateFlywaySQL,
    description: 'Flyway-compatible SQL migration with version prefix',
  },
  {
    id: 'liquibase-xml',
    name: 'Liquibase XML',
    filename: 'schemasync-liquibase.xml',
    mimeType: 'application/xml',
    generator: generateLiquibaseXML,
    description: 'Liquibase XML changeLog format with changeSet entries',
  },
  {
    id: 'dms-json',
    name: 'AWS DMS JSON',
    filename: 'schemasync-dms-mapping.json',
    mimeType: 'application/json',
    generator: generateDMSJSON,
    description: 'AWS Database Migration Service task configuration',
  },
  {
    id: 'rollback-sql',
    name: 'Rollback SQL',
    filename: 'schemasync-rollback.sql',
    mimeType: 'text/plain',
    generator: generateRollbackSQL,
    description: 'Undo script to revert the migration',
  },
]
