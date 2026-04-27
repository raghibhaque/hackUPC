import { useCallback } from 'react'
import { commentWatchingManager } from '../lib/commentWatching'

export function useCommentWatching(commentId: string, userId: string) {
  const watch = useCallback((notifyOn?: string[], includeThreads = true) => {
    return commentWatchingManager.watchComment(commentId, userId, notifyOn, includeThreads)
  }, [commentId, userId])

  const unwatch = useCallback((watchId: string) => {
    return commentWatchingManager.unwatchComment(watchId)
  }, [])

  const isWatching = useCallback((): boolean => {
    return commentWatchingManager.isWatching(commentId, userId)
  }, [commentId, userId])

  const getWatchers = useCallback(() => {
    return commentWatchingManager.getActiveWatchers(commentId)
  }, [commentId])

  const updatePreferences = useCallback((watchId: string, notifyOn: string[]) => {
    return commentWatchingManager.updateNotificationPreferences(watchId, notifyOn)
  }, [])

  return {
    watch,
    unwatch,
    isWatching,
    getWatchers,
    updatePreferences,
  }
}

export function useCommentWatchesForUser(userId: string) {
  const getMyWatches = useCallback(() => {
    return commentWatchingManager.getWatchesForUser(userId)
  }, [userId])

  const unwatchAll = useCallback((commentId: string) => {
    return commentWatchingManager.unwatchAll(commentId)
  }, [])

  return {
    getMyWatches,
    unwatchAll,
  }
}

export function useWatchingManager() {
  const getMostWatched = useCallback((limit?: number) => {
    return commentWatchingManager.getMostWatchedComments(limit)
  }, [])

  const getStats = useCallback(() => {
    return commentWatchingManager.getWatchStats()
  }, [])

  return {
    getMostWatched,
    getStats,
  }
}
