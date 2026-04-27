import { useCallback } from 'react'
import { rateLimiter } from '../lib/commentRateLimiting'

export function useRateLimiting(userId: string) {
  const canPost = useCallback(() => rateLimiter.canPostComment(userId), [userId])
  const getRemaining = useCallback(() => rateLimiter.getRemaining(userId), [userId])
  const record = useCallback(() => rateLimiter.recordComment(userId), [userId])
  return {canPost, getRemaining, record}
}
