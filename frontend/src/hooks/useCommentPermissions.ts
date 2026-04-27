import { useCallback } from 'react'
import { commentPermissionsManager, type PermissionLevel } from '../lib/commentPermissions'

export function useCommentPermissions(commentId: string, currentUserId: string) {
  const setOwner = useCallback((userId: string) => {
    commentPermissionsManager.setCommentOwner(commentId, userId)
  }, [commentId])

  const getOwner = useCallback(() => {
    return commentPermissionsManager.getCommentOwner(commentId)
  }, [commentId])

  const grant = useCallback((userId: string, level: PermissionLevel) => {
    return commentPermissionsManager.grantPermission(commentId, userId, level, currentUserId)
  }, [commentId, currentUserId])

  const revoke = useCallback((userId: string) => {
    return commentPermissionsManager.revokePermission(commentId, userId)
  }, [commentId])

  const getLevel = useCallback(() => {
    return commentPermissionsManager.getPermissionLevel(commentId, currentUserId)
  }, [commentId, currentUserId])

  const canView = useCallback(() => {
    return commentPermissionsManager.canView(commentId, currentUserId)
  }, [commentId, currentUserId])

  const canEdit = useCallback(() => {
    return commentPermissionsManager.canEdit(commentId, currentUserId)
  }, [commentId, currentUserId])

  const canDelete = useCallback(() => {
    return commentPermissionsManager.canDelete(commentId, currentUserId)
  }, [commentId, currentUserId])

  const canChangePerms = useCallback(() => {
    return commentPermissionsManager.canChangePermissions(commentId, currentUserId)
  }, [commentId, currentUserId])

  const getPermissions = useCallback(() => {
    return commentPermissionsManager.getPermissionsByComment(commentId)
  }, [commentId])

  const getUsersWithAccess = useCallback(() => {
    return commentPermissionsManager.getUsersWithAccess(commentId)
  }, [commentId])

  const share = useCallback((userId: string, level: PermissionLevel = 'viewer') => {
    return commentPermissionsManager.shareWithUser(commentId, userId, level, currentUserId)
  }, [commentId, currentUserId])

  const shareWithTeam = useCallback((teamUserIds: string[], level: PermissionLevel = 'viewer') => {
    return commentPermissionsManager.shareWithTeam(commentId, teamUserIds, level, currentUserId)
  }, [commentId, currentUserId])

  const makePublic = useCallback(() => {
    commentPermissionsManager.makePublic(commentId)
  }, [commentId])

  const makePrivate = useCallback(() => {
    commentPermissionsManager.makePrivate(commentId)
  }, [commentId])

  const isPublic = useCallback(() => {
    return commentPermissionsManager.isPublic(commentId)
  }, [commentId])

  const getStats = useCallback(() => {
    return commentPermissionsManager.getAccessStats(commentId)
  }, [commentId])

  return {
    setOwner,
    getOwner,
    grant,
    revoke,
    getLevel,
    canView,
    canEdit,
    canDelete,
    canChangePerms,
    getPermissions,
    getUsersWithAccess,
    share,
    shareWithTeam,
    makePublic,
    makePrivate,
    isPublic,
    getStats,
  }
}

export function useUserCommentPermissions(userId: string) {
  const getPermissions = useCallback(() => {
    return commentPermissionsManager.getPermissionsByUser(userId)
  }, [userId])

  return {
    getPermissions,
  }
}
