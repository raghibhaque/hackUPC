import { useCallback } from 'react'
import { commentModerationManager, type ModerationFlag } from '../lib/commentModeration'

export function useCommentModeration(commentId: string, currentUserId: string) {
  const flag = useCallback((reason: ModerationFlag['reason'], description: string) => {
    return commentModerationManager.flagComment(commentId, reason, description, currentUserId)
  }, [commentId, currentUserId])

  const getFlags = useCallback((): ModerationFlag[] => {
    return commentModerationManager.getFlagsByComment(commentId)
  }, [commentId])

  const getFlagCount = useCallback((): number => {
    return commentModerationManager.getFlagsByComment(commentId).length
  }, [commentId])

  return {
    flag,
    getFlags,
    getFlagCount,
  }
}

export function useModeratorTools() {
  const reviewFlag = useCallback((flagId: string, status: 'reviewed' | 'resolved' | 'dismissed', resolution?: string) => {
    return commentModerationManager.reviewFlag(flagId, status, resolution)
  }, [])

  const getPendingFlags = useCallback(() => {
    return commentModerationManager.getPendingFlags()
  }, [])

  const getModeratorQueue = useCallback(() => {
    return commentModerationManager.getModeratorQueue()
  }, [])

  const blockUser = useCallback((userId: string) => {
    commentModerationManager.blockUser(userId)
  }, [])

  const unblockUser = useCallback((userId: string) => {
    commentModerationManager.unblockUser(userId)
  }, [])

  const isUserBlocked = useCallback((userId: string) => {
    return commentModerationManager.isUserBlocked(userId)
  }, [])

  const shadowBanUser = useCallback((userId: string) => {
    commentModerationManager.shadowBanUser(userId)
  }, [])

  const unshadowBanUser = useCallback((userId: string) => {
    commentModerationManager.unshadowBanUser(userId)
  }, [])

  const isUserShadowBanned = useCallback((userId: string) => {
    return commentModerationManager.isUserShadowBanned(userId)
  }, [])

  const getStats = useCallback(() => {
    return commentModerationManager.getFlagStats()
  }, [])

  const getBlockedUsers = useCallback(() => {
    return commentModerationManager.getBlockedUsers()
  }, [])

  const getShadowBannedUsers = useCallback(() => {
    return commentModerationManager.getShadowBannedUsers()
  }, [])

  return {
    reviewFlag,
    getPendingFlags,
    getModeratorQueue,
    blockUser,
    unblockUser,
    isUserBlocked,
    shadowBanUser,
    unshadowBanUser,
    isUserShadowBanned,
    getStats,
    getBlockedUsers,
    getShadowBannedUsers,
  }
}
