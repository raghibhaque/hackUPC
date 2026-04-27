import { useCallback } from 'react'
import { commentReadTracker } from '../lib/commentReadTracking'

export function useCommentReadTracking(commentId: string, userId: string) {
  const markRead = useCallback(() => commentReadTracker.markAsRead(commentId, userId), [commentId, userId])
  const isRead = useCallback(() => commentReadTracker.isRead(commentId, userId), [commentId, userId])
  const getReaderCount = useCallback(() => commentReadTracker.getReaderCount(commentId), [commentId])
  return {markRead, isRead, getReaderCount}
}
