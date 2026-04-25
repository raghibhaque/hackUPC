import { useState, useCallback, useEffect, useMemo } from 'react'
import type { ReviewState, ReviewDecision, ReviewStatus, ReviewStats } from '../types/review'

const STORAGE_KEY = 'schemahub:review-state'

export function useReviewState(sessionId: string) {
  const [reviews, setReviews] = useState<ReviewState>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}:${sessionId}`)
      return stored ? JSON.parse(stored) : {}
    } catch (e) {
      console.warn('Failed to load review state from localStorage:', e)
      return {}
    }
  })

  // Persist to localStorage whenever reviews change
  useEffect(() => {
    try {
      localStorage.setItem(`${STORAGE_KEY}:${sessionId}`, JSON.stringify(reviews))
    } catch (e) {
      console.warn('Failed to persist review state to localStorage:', e)
    }
  }, [reviews, sessionId])

  // Approve a mapping
  const approve = useCallback((mappingId: string, notes?: string) => {
    setReviews(prev => ({
      ...prev,
      [mappingId]: {
        mappingId,
        status: 'approved',
        timestamp: Date.now(),
        notes,
      },
    }))
  }, [])

  // Reject a mapping
  const reject = useCallback((mappingId: string, notes?: string) => {
    setReviews(prev => ({
      ...prev,
      [mappingId]: {
        mappingId,
        status: 'rejected',
        timestamp: Date.now(),
        notes,
      },
    }))
  }, [])

  // Mark as modified with edited mapping
  const markModified = useCallback(
    (mappingId: string, editedMapping: { sourceColumnId: string; targetColumnId: string }, notes?: string) => {
      setReviews(prev => ({
        ...prev,
        [mappingId]: {
          mappingId,
          status: 'modified',
          timestamp: Date.now(),
          editedMapping,
          notes,
        },
      }))
    },
    []
  )

  // Reset a mapping to unreviewed
  const reset = useCallback((mappingId: string) => {
    setReviews(prev => {
      const newReviews = { ...prev }
      delete newReviews[mappingId]
      return newReviews
    })
  }, [])

  // Get review decision for a mapping
  const getReview = useCallback(
    (mappingId: string): ReviewDecision | undefined => {
      return reviews[mappingId]
    },
    [reviews]
  )

  // Get status for a mapping (defaults to 'unreviewed')
  const getStatus = useCallback(
    (mappingId: string): ReviewStatus => {
      return reviews[mappingId]?.status || 'unreviewed'
    },
    [reviews]
  )

  // Calculate stats
  const stats = useMemo<ReviewStats>(() => {
    const allReviews = Object.values(reviews)
    const total = allReviews.length
    const approved = allReviews.filter(r => r.status === 'approved').length
    const rejected = allReviews.filter(r => r.status === 'rejected').length
    const modified = allReviews.filter(r => r.status === 'modified').length
    const unreviewed = total - (approved + rejected + modified)

    return {
      total,
      approved,
      rejected,
      modified,
      unreviewed,
      percentReviewed: total > 0 ? Math.round((approved + rejected + modified) / total * 100) : 0,
    }
  }, [reviews])

  // Clear all reviews for a fresh start
  const clearAll = useCallback(() => {
    setReviews({})
  }, [])

  // Get all reviews
  const getAll = useCallback(() => reviews, [reviews])

  return {
    reviews,
    approve,
    reject,
    markModified,
    reset,
    getReview,
    getStatus,
    stats,
    clearAll,
    getAll,
  }
}
