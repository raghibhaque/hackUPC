import { useMemo } from 'react'
import type { TableMapping } from '../types'

export interface ConflictPattern {
  id: string
  type: 'type_mismatch' | 'name_similarity' | 'ambiguous_mapping' | 'data_loss_risk'
  description: string
  count: number
  affectedMappings: Array<{ tableA: string; tableB: string; colA: string; colB: string }>
  suggestedResolution: string
  riskLevel: 'low' | 'medium' | 'high'
  autoResolvable: boolean
}

export function useConflictPatterns(mappings: TableMapping[] | null | undefined): ConflictPattern[] {
  return useMemo(() => {
    if (!mappings || mappings.length === 0) return []

    const patterns: Map<string, ConflictPattern> = new Map()

    mappings.forEach(mapping => {
      mapping.column_mappings?.forEach(col => {
        if (!col.conflicts || col.conflicts.length === 0) return

        col.conflicts.forEach(() => {
          const sourceType = col.col_a.data_type?.base_type || 'unknown'
          const targetType = col.col_b.data_type?.base_type || 'unknown'

          if (sourceType !== targetType) {
            const typePairKey = `type_mismatch_${sourceType}_${targetType}`

            if (!patterns.has(typePairKey)) {
              patterns.set(typePairKey, {
                id: typePairKey,
                type: 'type_mismatch',
                description: `Type mismatch: ${sourceType} → ${targetType}`,
                count: 0,
                affectedMappings: [],
                suggestedResolution: getSuggestedTypeConversion(sourceType, targetType),
                riskLevel: getTypeConversionRiskLevel(sourceType, targetType),
                autoResolvable: isTypeConversionAutoResolvable(sourceType, targetType),
              })
            }

            const pattern = patterns.get(typePairKey)!
            pattern.count++
            pattern.affectedMappings.push({
              tableA: mapping.table_a.name,
              tableB: mapping.table_b.name,
              colA: col.col_a.name,
              colB: col.col_b.name,
            })
          }

          if (conflict.reason?.includes('ambiguous')) {
            const ambiguityKey = `ambiguous_${mapping.table_a.name}_${mapping.table_b.name}`

            if (!patterns.has(ambiguityKey)) {
              patterns.set(ambiguityKey, {
                id: ambiguityKey,
                type: 'ambiguous_mapping',
                description: `Ambiguous mapping in ${mapping.table_a.name} → ${mapping.table_b.name}`,
                count: 1,
                affectedMappings: [{
                  tableA: mapping.table_a.name,
                  tableB: mapping.table_b.name,
                  colA: col.col_a.name,
                  colB: col.col_b.name,
                }],
                suggestedResolution: 'Manual review required - multiple valid target columns detected',
                riskLevel: 'high',
                autoResolvable: false,
              })
            }
          }
        })
      })
    })

    return Array.from(patterns.values()).sort((a, b) => b.count - a.count)
  }, [mappings])
}

function getSuggestedTypeConversion(sourceType: string, targetType: string): string {
  const source = sourceType.toLowerCase()
  const target = targetType.toLowerCase()

  const typeMap: Record<string, Record<string, string>> = {
    varchar: {
      int: 'CAST(col AS INT)',
      bigint: 'CAST(col AS BIGINT)',
      date: "STR_TO_DATE(col, '%Y-%m-%d')",
      datetime: "STR_TO_DATE(col, '%Y-%m-%d %H:%i:%s')",
    },
    int: {
      varchar: 'CAST(col AS VARCHAR)',
      date: 'DATE_FORMAT(FROM_UNIXTIME(col), "%Y-%m-%d")',
    },
    datetime: {
      date: 'CAST(col AS DATE)',
      varchar: "DATE_FORMAT(col, '%Y-%m-%d %H:%i:%s')",
    },
    date: {
      datetime: 'CAST(col AS DATETIME)',
      varchar: "DATE_FORMAT(col, '%Y-%m-%d')",
    },
  }

  return typeMap[source]?.[target] || `CAST(col AS ${target.toUpperCase()})`
}

function getTypeConversionRiskLevel(sourceType: string, targetType: string): 'low' | 'medium' | 'high' {
  const source = sourceType.toLowerCase().split('(')[0]
  const target = targetType.toLowerCase().split('(')[0]

  const numericTypes = ['int', 'bigint', 'smallint', 'decimal', 'float', 'double', 'numeric']
  const stringTypes = ['varchar', 'char', 'text', 'nvarchar']
  const dateTypes = ['date', 'datetime', 'timestamp', 'time']

  const sourceCategory = numericTypes.includes(source)
    ? 'numeric'
    : stringTypes.includes(source)
      ? 'string'
      : dateTypes.includes(source)
        ? 'date'
        : 'other'

  const targetCategory = numericTypes.includes(target)
    ? 'numeric'
    : stringTypes.includes(target)
      ? 'string'
      : dateTypes.includes(target)
        ? 'date'
        : 'other'

  if (sourceCategory === targetCategory) return 'low'
  if (
    (sourceCategory === 'string' && targetCategory === 'numeric') ||
    (sourceCategory === 'numeric' && targetCategory === 'string') ||
    (sourceCategory === 'date' && targetCategory === 'numeric')
  ) {
    return 'high'
  }

  return 'medium'
}

function isTypeConversionAutoResolvable(sourceType: string, targetType: string): boolean {
  const source = sourceType.toLowerCase().split('(')[0]
  const target = targetType.toLowerCase().split('(')[0]

  const numericTypes = ['int', 'bigint', 'smallint', 'decimal', 'float', 'double', 'numeric']
  const stringTypes = ['varchar', 'char', 'text', 'nvarchar']
  const dateTypes = ['date', 'datetime', 'timestamp']

  const sourceIsNumeric = numericTypes.includes(source)
  const sourceIsString = stringTypes.includes(source)
  const sourceIsDate = dateTypes.includes(source)

  const targetIsNumeric = numericTypes.includes(target)
  const targetIsDate = dateTypes.includes(target)

  if (sourceIsString && (targetIsNumeric || targetIsDate)) return false
  if (sourceIsNumeric && sourceIsDate) return false

  return true
}
