import type { ReconciliationResult, TableMapping, ColumnMapping } from '../types'

export interface BusinessImpactMetrics {
  totalMappings: number
  autoResolvedCount: number
  autoResolvedPercentage: number
  needsReviewCount: number
  highRiskCount: number
  totalUnmappedColumns: number
  estimatedTimeSavedMinutes: number
  estimatedTimeSavedHours: number
  conflictCount: number
  averageConfidence: number
}

export interface TopIssue {
  type: 'low_confidence' | 'conflicts'
  sourceTable: string
  targetTable: string
  confidence: number
  conflictCount: number
  severity: 'critical' | 'high' | 'medium'
}

export function calculateBusinessImpactMetrics(result: ReconciliationResult): BusinessImpactMetrics {
  if (!result.table_mappings || result.table_mappings.length === 0) {
    return {
      totalMappings: 0,
      autoResolvedCount: 0,
      autoResolvedPercentage: 0,
      needsReviewCount: 0,
      highRiskCount: 0,
      totalUnmappedColumns: 0,
      estimatedTimeSavedMinutes: 0,
      estimatedTimeSavedHours: 0,
      conflictCount: 0,
      averageConfidence: 0,
    }
  }

  const tableMappings = result.table_mappings
  const totalMappings = tableMappings.length

  let autoResolvedCount = 0
  let needsReviewCount = 0
  let highRiskCount = 0
  let totalUnmappedColumns = 0
  let totalConflicts = 0
  let totalConfidence = 0
  let totalColumnMappings = 0

  tableMappings.forEach(mapping => {
    const tableConfidence = mapping.confidence

    // Count unmapped columns
    const unmappedA = (mapping.unmatched_columns_a || []).length
    const unmappedB = (mapping.unmatched_columns_b || []).length
    totalUnmappedColumns += unmappedA + unmappedB

    // Analyze column mappings for conflicts
    const columnMappings = mapping.column_mappings || []
    let mappingConflicts = 0

    columnMappings.forEach(cm => {
      totalColumnMappings++
      totalConfidence += cm.confidence

      if (cm.conflicts && cm.conflicts.length > 0) {
        totalConflicts += cm.conflicts.length
        mappingConflicts += cm.conflicts.length
      }
    })

    // Categorize table mapping
    const hasConflicts = mappingConflicts > 0
    const lowConfidence = tableConfidence < 0.5
    const mediumConfidence = tableConfidence >= 0.5 && tableConfidence <= 0.85
    const highConfidence = tableConfidence > 0.85

    if (highConfidence && !hasConflicts) {
      autoResolvedCount++
    } else if ((mediumConfidence || hasConflicts) && !lowConfidence) {
      needsReviewCount++
    } else if (lowConfidence || (hasConflicts && tableConfidence < 0.7)) {
      highRiskCount++
    } else {
      // Default: medium confidence without conflicts
      needsReviewCount++
    }
  })

  // Calculate metrics
  const autoResolvedPercentage = totalMappings > 0 ? (autoResolvedCount / totalMappings) * 100 : 0

  // Time saved calculation:
  // - Auto-resolved mappings: 0 minutes (already done)
  // - Needs review mappings: 3 minutes each (quick review + confirmation)
  // - High-risk mappings: 10 minutes each (detailed review, analysis, decision)
  const timeSavedByAutomation = autoResolvedCount * 5 + needsReviewCount * 2 + highRiskCount * 5
  const totalTimeIfManual = totalMappings * 5

  const estimatedTimeSavedMinutes = totalTimeIfManual - timeSavedByAutomation

  const averageConfidence = totalColumnMappings > 0 ? totalConfidence / totalColumnMappings : 0

  return {
    totalMappings,
    autoResolvedCount,
    autoResolvedPercentage: Math.round(autoResolvedPercentage * 10) / 10,
    needsReviewCount,
    highRiskCount,
    totalUnmappedColumns,
    estimatedTimeSavedMinutes: Math.max(0, estimatedTimeSavedMinutes),
    estimatedTimeSavedHours: Math.round((Math.max(0, estimatedTimeSavedMinutes) / 60) * 10) / 10,
    conflictCount: totalConflicts,
    averageConfidence: Math.round(averageConfidence * 1000) / 1000,
  }
}

export function getTopIssues(result: ReconciliationResult, limit: number = 5): TopIssue[] {
  if (!result.table_mappings || result.table_mappings.length === 0) {
    return []
  }

  const issues: TopIssue[] = []

  result.table_mappings.forEach(mapping => {
    const columnMappings = mapping.column_mappings || []
    let conflictCount = 0

    columnMappings.forEach(cm => {
      if (cm.conflicts && cm.conflicts.length > 0) {
        conflictCount += cm.conflicts.length
      }
    })

    // Add low confidence issue
    if (mapping.confidence < 0.7) {
      const severity: 'critical' | 'high' | 'medium' =
        mapping.confidence < 0.5 ? 'critical' : mapping.confidence < 0.6 ? 'high' : 'medium'

      issues.push({
        type: 'low_confidence',
        sourceTable: mapping.table_a.name,
        targetTable: mapping.table_b.name,
        confidence: mapping.confidence,
        conflictCount: 0,
        severity,
      })
    }

    // Add conflict issue
    if (conflictCount > 0) {
      const severity: 'critical' | 'high' | 'medium' =
        conflictCount >= 5 ? 'critical' : conflictCount >= 3 ? 'high' : 'medium'

      issues.push({
        type: 'conflicts',
        sourceTable: mapping.table_a.name,
        targetTable: mapping.table_b.name,
        confidence: mapping.confidence,
        conflictCount,
        severity,
      })
    }
  })

  // Sort by severity (critical first), then by impact
  const severityOrder = { critical: 0, high: 1, medium: 2 }
  issues.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff

    // Within same severity, sort by impact
    if (a.type === 'conflicts' && b.type === 'conflicts') {
      return b.conflictCount - a.conflictCount
    }
    if (a.type === 'low_confidence' && b.type === 'low_confidence') {
      return a.confidence - b.confidence
    }

    return 0
  })

  return issues.slice(0, limit)
}

export function formatTimeSaved(hours: number, minutes: number): string {
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}
