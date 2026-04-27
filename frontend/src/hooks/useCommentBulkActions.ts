import { useState, useCallback } from 'react'
import { commentBulkActionsManager } from '../lib/commentBulkActions'
import type { CommentThread, Comment } from '../lib/comments'

export function useCommentBulkActions(threads: CommentThread[], onRefresh: () => void) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((commentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }, [])

  const selectAll = useCallback((comments: Comment[]) => {
    setSelectedIds(new Set(comments.map(c => c.id)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const markSelectedAsResolved = useCallback(() => {
    commentBulkActionsManager.markMultipleAsResolved(Array.from(selectedIds))
    clearSelection()
    onRefresh()
  }, [selectedIds, onRefresh, clearSelection])

  const deleteSelected = useCallback(() => {
    commentBulkActionsManager.deleteMultiple(Array.from(selectedIds))
    clearSelection()
    onRefresh()
  }, [selectedIds, onRefresh, clearSelection])

  const addReactionToSelected = useCallback((emoji: string, user: string) => {
    commentBulkActionsManager.addReactionToMultiple(Array.from(selectedIds), emoji, user)
    clearSelection()
    onRefresh()
  }, [selectedIds, onRefresh, clearSelection])

  const selectByPattern = useCallback((pattern: any) => {
    const selected = commentBulkActionsManager.selectCommentsByPattern(threads, pattern)
    setSelectedIds(new Set(selected.map(c => c.id)))
  }, [threads])

  const selectUnresolved = useCallback(() => {
    const unresolved = commentBulkActionsManager.getUnresolvedComments(threads)
    setSelectedIds(new Set(unresolved.map(c => c.id)))
  }, [threads])

  const selectByAuthor = useCallback((author: string) => {
    const byAuthor = commentBulkActionsManager.getCommentsByAuthor(threads, author)
    setSelectedIds(new Set(byAuthor.map(c => c.id)))
  }, [threads])

  const selectWithoutReactions = useCallback(() => {
    const withoutReactions = commentBulkActionsManager.getCommentsWithoutReactions(threads)
    setSelectedIds(new Set(withoutReactions.map(c => c.id)))
  }, [threads])

  const selectCreatedAfter = useCallback((timestamp: number) => {
    const after = commentBulkActionsManager.getCommentsCreatedAfter(threads, timestamp)
    setSelectedIds(new Set(after.map(c => c.id)))
  }, [threads])

  const selectCreatedBefore = useCallback((timestamp: number) => {
    const before = commentBulkActionsManager.getCommentsCreatedBefore(threads, timestamp)
    setSelectedIds(new Set(before.map(c => c.id)))
  }, [threads])

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    clearSelection,
    markSelectedAsResolved,
    deleteSelected,
    addReactionToSelected,
    selectByPattern,
    selectUnresolved,
    selectByAuthor,
    selectWithoutReactions,
    selectCreatedAfter,
    selectCreatedBefore,
  }
}
