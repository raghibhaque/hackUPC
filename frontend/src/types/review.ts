/**
 * Review state types for manual mapping review layer
 */

export type ReviewStatus = 'unreviewed' | 'approved' | 'rejected' | 'modified'

export interface ReviewDecision {
  mappingId: string // unique identifier for the mapping
  status: ReviewStatus
  timestamp: number
  notes?: string
  editedMapping?: {
    sourceColumnId: string
    targetColumnId: string
  }
}

export interface ReviewState {
  [mappingId: string]: ReviewDecision
}

export interface ReviewStats {
  total: number
  approved: number
  rejected: number
  modified: number
  unreviewed: number
  percentReviewed: number
}
