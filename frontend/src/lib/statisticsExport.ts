import type { ReconciliationResult, TableMapping } from '../types'

export interface StatisticsExport {
  exportDate: string
  schemaName: string
  summary: {
    totalTables: number
    totalColumns: number
    totalMappedColumns: number
    totalConflicts: number
  }
  tables: Array<{
    name: string
    sourceTable: string
    targetTable: string
    sourceColumns: number
    targetColumns: number
    mappedColumns: number
    unmappedSourceColumns: number
    unmappedTargetColumns: number
    typeConflicts: number
    confidence: number
    primaryKey: string | null
    indexes: number
  }>
}

export function generateStatisticsExport(result: ReconciliationResult, schemaName: string = 'Schema'): StatisticsExport {
  if (!result.table_mappings) {
    return {
      exportDate: new Date().toISOString(),
      schemaName,
      summary: {
        totalTables: 0,
        totalColumns: 0,
        totalMappedColumns: 0,
        totalConflicts: 0,
      },
      tables: [],
    }
  }

  let totalConflicts = 0
  let totalMappedColumns = 0
  let totalColumns = 0

  const tables = result.table_mappings.map(mapping => {
    const sourceColumns = mapping.table_a.columns.length
    const targetColumns = mapping.table_b.columns.length
    const mappedColumns = mapping.column_mappings?.length || 0
    const unmappedSourceColumns = sourceColumns - mappedColumns
    const unmappedTargetColumns = targetColumns - mappedColumns

    const typeConflicts = (mapping.column_mappings || []).filter(cm => {
      const sourceType = (cm.col_a?.data_type?.base_type || '').toLowerCase()
      const targetType = (cm.col_b?.data_type?.base_type || '').toLowerCase()
      return sourceType !== targetType && sourceType !== '' && targetType !== ''
    }).length

    totalConflicts += typeConflicts
    totalMappedColumns += mappedColumns
    totalColumns += sourceColumns

    return {
      name: `${mapping.table_a.name} → ${mapping.table_b.name}`,
      sourceTable: mapping.table_a.name,
      targetTable: mapping.table_b.name,
      sourceColumns,
      targetColumns,
      mappedColumns,
      unmappedSourceColumns,
      unmappedTargetColumns,
      typeConflicts,
      confidence: mapping.confidence,
      primaryKey: mapping.table_a.primary_key || null,
      indexes: mapping.table_a.indexes?.length || 0,
    }
  })

  return {
    exportDate: new Date().toISOString(),
    schemaName,
    summary: {
      totalTables: result.table_mappings.length,
      totalColumns,
      totalMappedColumns,
      totalConflicts,
    },
    tables,
  }
}

export function exportAsJSON(data: StatisticsExport): string {
  return JSON.stringify(data, null, 2)
}

export function exportAsCSV(data: StatisticsExport): string {
  const rows: string[] = []

  // Header
  rows.push('Schema Statistics Export')
  rows.push(`Export Date: ${data.exportDate}`)
  rows.push(`Schema: ${data.schemaName}`)
  rows.push('')

  // Summary
  rows.push('SUMMARY')
  rows.push(`Total Tables,${data.summary.totalTables}`)
  rows.push(`Total Columns,${data.summary.totalColumns}`)
  rows.push(`Total Mapped Columns,${data.summary.totalMappedColumns}`)
  rows.push(`Total Type Conflicts,${data.summary.totalConflicts}`)
  rows.push('')

  // Table Details
  rows.push('TABLE DETAILS')
  rows.push(
    'Name,Source Columns,Target Columns,Mapped Columns,Unmapped Source,Unmapped Target,Type Conflicts,Confidence,Primary Key,Indexes'
  )

  data.tables.forEach(table => {
    rows.push(
      `"${table.name}",${table.sourceColumns},${table.targetColumns},${table.mappedColumns},${table.unmappedSourceColumns},${table.unmappedTargetColumns},${table.typeConflicts},${(table.confidence * 100).toFixed(1)}%,"${table.primaryKey || 'N/A'}",${table.indexes}`
    )
  })

  return rows.join('\n')
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function copyToClipboard(content: string): Promise<void> {
  return navigator.clipboard.writeText(content)
}
