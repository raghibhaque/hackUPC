import { useState, useEffect, useCallback } from 'react'
import { commentTagManager, type CommentTag } from '../lib/commentTags'

export function useCommentTags() {
  const [tags, setTags] = useState<CommentTag[]>([])

  useEffect(() => {
    setTags(commentTagManager.getAllTags())
  }, [])

  const createTag = useCallback((name: string, color: string, description?: string) => {
    const tag = commentTagManager.createTag(name, color, description)
    setTags(commentTagManager.getAllTags())
    return tag
  }, [])

  const updateTag = useCallback((tagId: string, updates: Partial<CommentTag>) => {
    return commentTagManager.updateTag(tagId, updates)
  }, [])

  const deleteTag = useCallback((tagId: string) => {
    const success = commentTagManager.deleteTag(tagId)
    if (success) {
      setTags(commentTagManager.getAllTags())
    }
    return success
  }, [])

  const assignTag = useCallback((cid: string, tagId: string, assignedBy: string) => {
    return commentTagManager.assignTag(cid, tagId, assignedBy)
  }, [])

  const removeTag = useCallback((cid: string, tagId: string) => {
    return commentTagManager.removeTag(cid, tagId)
  }, [])

  const getCommentTags = useCallback((cid: string) => {
    return commentTagManager.getCommentTags(cid)
  }, [])

  const getPopularTags = useCallback((limit?: number) => {
    return commentTagManager.getPopularTags(limit)
  }, [])

  const searchTags = useCallback((query: string) => {
    return commentTagManager.searchTags(query)
  }, [])

  const getAllTags = useCallback(() => {
    return tags
  }, [tags])

  return {
    tags,
    createTag,
    updateTag,
    deleteTag,
    assignTag,
    removeTag,
    getCommentTags,
    getPopularTags,
    searchTags,
    getAllTags,
  }
}

export function useCommentTagsForComment(commentId: string, currentUserId: string) {
  const [commentTags, setCommentTags] = useState<CommentTag[]>([])
  const [allTags, setAllTags] = useState<CommentTag[]>([])

  useEffect(() => {
    setCommentTags(commentTagManager.getCommentTags(commentId))
    setAllTags(commentTagManager.getAllTags())
  }, [commentId])

  const assignTag = useCallback((tagId: string) => {
    const result = commentTagManager.assignTag(commentId, tagId, currentUserId)
    if (result) {
      setCommentTags(commentTagManager.getCommentTags(commentId))
    }
    return result
  }, [commentId, currentUserId])

  const removeTag = useCallback((tagId: string) => {
    const success = commentTagManager.removeTag(commentId, tagId)
    if (success) {
      setCommentTags(commentTagManager.getCommentTags(commentId))
    }
    return success
  }, [commentId])

  const hasTag = useCallback((tagId: string) => {
    return commentTagManager.hasTag(commentId, tagId)
  }, [commentId])

  return {
    commentTags,
    allTags,
    assignTag,
    removeTag,
    hasTag,
  }
}
