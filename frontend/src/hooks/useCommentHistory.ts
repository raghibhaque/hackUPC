import { useCallback } from 'react'
import { commentHistoryManager, type CommentEdit, type CommentAuditLog } from '../lib/commentHistory'

export function useCommentHistory(commentId: string) {
  const recordEdit = useCallback((previousContent: string, newContent: string, editedBy: string, reason?: string) => {
    return commentHistoryManager.recordEdit(commentId, previousContent, newContent, editedBy, reason)
  }, [commentId])

  const recordAction = useCallback((action: CommentAuditLog['action'], actor: string, metadata?: Record<string, any>) => {
    return commentHistoryManager.recordAuditLog(commentId, action, actor, metadata)
  }, [commentId])

  const getEditHistory = useCallback((): CommentEdit[] => {
    return commentHistoryManager.getEditHistory(commentId)
  }, [commentId])

  const getAuditLog = useCallback((): CommentAuditLog[] => {
    return commentHistoryManager.getAuditLog(commentId)
  }, [commentId])

  const getEditCount = useCallback((): number => {
    return commentHistoryManager.getEditCount(commentId)
  }, [commentId])

  const hasBeenEdited = useCallback((): boolean => {
    return commentHistoryManager.hasBeenEdited(commentId)
  }, [commentId])

  const getLastEdit = useCallback(() => {
    return commentHistoryManager.getLastEdit(commentId)
  }, [commentId])

  const getEditDiff = useCallback((editId: string) => {
    return commentHistoryManager.getEditDiff(commentId, editId)
  }, [commentId])

  const getActionTimeline = useCallback(() => {
    return commentHistoryManager.getActionTimeline(commentId)
  }, [commentId])

  return {
    recordEdit,
    recordAction,
    getEditHistory,
    getAuditLog,
    getEditCount,
    hasBeenEdited,
    getLastEdit,
    getEditDiff,
    getActionTimeline,
  }
}

export function useCommentHistoryStats() {
  const getTotalEditCount = useCallback(() => {
    return commentHistoryManager.getTotalEditCount()
  }, [])

  const getCommentsByEditCount = useCallback((limit?: number) => {
    return commentHistoryManager.getCommentsByEditCount(limit)
  }, [])

  const getRecentActivity = useCallback((limit?: number) => {
    return commentHistoryManager.getRecentActivity(limit)
  }, [])

  const getActivityByUser = useCallback((user: string) => {
    return commentHistoryManager.getActivityByUser(user)
  }, [])

  return {
    getTotalEditCount,
    getCommentsByEditCount,
    getRecentActivity,
    getActivityByUser,
  }
}
