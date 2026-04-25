import { useMemo } from 'react'
import type { ReconciliationResult, TableMapping } from '../../types'

export interface TableStats {
  name: string
  columnCount: number
  dataTypes: Record<string, number>
  primaryKey?: string
  indexes?: number
  uniqueConstraints?: number
}

export interface MappingStats {
  sourceTable: TableStats
  targetTable: TableStats
  matchedColumns: number
  unmappedSourceColumns: number
  unmappedTargetColumns: number
  typeConflicts: number
}

export function useTableStatistics(result: ReconciliationResult) {
  const stats = useMemo(() => {
    if (!result.table_mappings) return []

    return result.table_mappings.map((mapping: TableMapping): MappingStats => {
      // Get source table stats
      const sourceTable = mapping.table_a
      const sourceColumns = mapping.column_mappings?.map((cm: any) => cm.col_a) || []
      const sourceDataTypes: Record<string, number> = {}

      sourceColumns.forEach((col: any) => {
        const type = col.type || 'UNKNOWN'
        sourceDataTypes[type] = (sourceDataTypes[type] || 0) + 1
      })

      const sourceStats: TableStats = {
        name: sourceTable.name,
        columnCount: sourceColumns.length,
        dataTypes: sourceDataTypes,
        primaryKey: sourceTable.primary_key,
        indexes: sourceTable.indexes?.length || 0,
        uniqueConstraints: sourceTable.unique_constraints?.length || 0,
      }

      // Get target table stats
      const targetTable = mapping.table_b
      const targetColumns = mapping.column_mappings?.map((cm: any) => cm.col_b) || []
      const targetDataTypes: Record<string, number> = {}

      targetColumns.forEach((col: any) => {
        const type = col.type || 'UNKNOWN'
        targetDataTypes[type] = (targetDataTypes[type] || 0) + 1
      })

      const targetStats: TableStats = {
        name: targetTable.name,
        columnCount: targetColumns.length,
        dataTypes: targetDataTypes,
        primaryKey: targetTable.primary_key,
        indexes: targetTable.indexes?.length || 0,
        uniqueConstraints: targetTable.unique_constraints?.length || 0,
      }

      // Calculate mapping stats
      const mappedColumns = mapping.column_mappings?.length || 0
      const unmappedSourceColumns = sourceColumns.length - mappedColumns
      const unmappedTargetColumns = targetColumns.length - mappedColumns

      const typeConflicts = (mapping.column_mappings || []).filter((cm: any) => {
        const sourceType = (cm.col_a?.type || '').toLowerCase()
        const targetType = (cm.col_b?.type || '').toLowerCase()
        return sourceType !== targetType && sourceType !== '' && targetType !== ''
      }).length

      return {
        sourceTable: sourceStats,
        targetTable: targetStats,
        matchedColumns: mappedColumns,
        unmappedSourceColumns,
        unmappedTargetColumns,
        typeConflicts,
      }
    })
  }, [result.table_mappings])

  return stats
}

export function getDataTypeCategory(type: string): string {
  const typeUpper = type.toUpperCase()
  
  if (typeUpper.includes('INT') || typeUpper.includes('BIGINT') || typeUpper.includes('SMALLINT')) {
    return 'Integer'
  }
  if (typeUpper.includes('FLOAT') || typeUpper.includes('DOUBLE') || typeUpper.includes('DECIMAL') || typeUpper.includes('NUMERIC')) {
    return 'Decimal'
  }
  if (typeUpper.includes('VARCHAR') || typeUpper.includes('CHAR') || typeUpper.includes('TEXT') || typeUpper.includes('STRING')) {
    return 'Text'
  }
  if (typeUpper.includes('DATE') || typeUpper.includes('TIME') || typeUpper.includes('TIMESTAMP')) {
    return 'DateTime'
  }
  if (typeUpper.includes('BOOL')) {
    return 'Boolean'
  }
  if (typeUpper.includes('JSON') || typeUpper.includes('JSONB')) {
    return 'JSON'
  }
  if (typeUpper.includes('BLOB') || typeUpper.includes('BINARY')) {
    return 'Binary'
  }
  
  return 'Other'
}

export function getTypeColor(type: string): string {
  const category = getDataTypeCategory(type)
  const colors: Record<string, string> = {
    'Integer': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Decimal': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Text': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'DateTime': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Boolean': 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'JSON': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    'Binary': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'Other': 'bg-white/10 text-white/60 border-white/20',
  }
  return colors[category] || colors['Other']
}
