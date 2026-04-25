import { useState, useMemo } from 'react'
import type { TableMapping } from '../../types'
import type { ReviewStatus } from '../../types/review'

interface FilterOptions {
  reviewStatus?: ReviewStatus | null
  showConflicts?: boolean
  minConfidence?: number
}

export function useReviewFilters(mappings: TableMapping[], reviewStates: Record<string, ReviewStatus>) {
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    reviewStatus: null,
    showConflicts: false,
    minConfidence: 0,
  })

  // Apply filters to mappings
  const filteredMappings = useMemo(() => {
    return mappings.filter(mapping => {
      // Get mapping ID (using table combo as unique identifier)
      const mappingId = `${mapping.table_a.id}:${mapping.table_b.id}`
      const reviewStatus = reviewStates[mappingId] || 'unreviewed'

      // Filter by review status
      if (activeFilters.reviewStatus && reviewStatus !== activeFilters.reviewStatus) {
        return false
      }

      // Filter by conflicts
      if (activeFilters.showConflicts) {
        const hasConflicts = mapping.column_mappings?.some(cm => cm.conflicts && cm.conflicts.length > 0)
        if (!hasConflicts) {
          return false
        }
      }

      // Filter by minimum confidence
      if (activeFilters.minConfidence && activeFilters.minConfidence > 0) {
        const minConfidenceInMapping = Math.min(
          ...(mapping.column_mappings?.map(cm => cm.confidence) || [1])
        )
        if (minConfidenceInMapping < activeFilters.minConfidence) {
          return false
        }
      }

      return true
    })
  }, [mappings, activeFilters, reviewStates])

  // Count by status
  const counts = useMemo(() => {
    const unreviewed = mappings.filter(m => {
      const mappingId = `${m.table_a.id}:${m.table_b.id}`
      return !reviewStates[mappingId]
    }).length

    const approved = mappings.filter(m => {
      const mappingId = `${m.table_a.id}:${m.table_b.id}`
      return reviewStates[mappingId] === 'approved'
    }).length

    const rejected = mappings.filter(m => {
      const mappingId = `${m.table_a.id}:${m.table_b.id}`
      return reviewStates[mappingId] === 'rejected'
    }).length

    const modified = mappings.filter(m => {
      const mappingId = `${m.table_a.id}:${m.table_b.id}`
      return reviewStates[mappingId] === 'modified'
    }).length

    return {
      unreviewed,
      approved,
      rejected,
      modified,
      total: mappings.length,
    }
  }, [mappings, reviewStates])

  // Set filter for review status (toggle)
  const setReviewStatusFilter = (status: ReviewStatus | null) => {
    setActiveFilters(prev => ({
      ...prev,
      reviewStatus: prev.reviewStatus === status ? null : status,
    }))
  }

  // Toggle conflicts filter
  const setConflictsFilter = (show: boolean) => {
    setActiveFilters(prev => ({
      ...prev,
      showConflicts: show,
    }))
  }

  // Set minimum confidence threshold
  const setConfidenceFilter = (minConfidence: number) => {
    setActiveFilters(prev => ({
      ...prev,
      minConfidence,
    }))
  }

  // Reset all filters
  const resetFilters = () => {
    setActiveFilters({
      reviewStatus: null,
      showConflicts: false,
      minConfidence: 0,
    })
  }

  return {
    filteredMappings,
    activeFilters,
    counts,
    setReviewStatusFilter,
    setConflictsFilter,
    setConfidenceFilter,
    resetFilters,
  }
}
