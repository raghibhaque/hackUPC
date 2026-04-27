import { useCallback } from 'react'
import { commentLinkManager } from '../lib/commentLinks'

export function useCommentLinks(commentId: string, currentUserId: string) {
  const createLink = useCallback((target: string, type: any, metadata?: Record<string, any>) => {
    return commentLinkManager.createLink(commentId, target, type, currentUserId, metadata)
  }, [commentId, currentUserId])

  const getOutgoing = useCallback(() => {
    return commentLinkManager.getLinksFromComment(commentId)
  }, [commentId])

  const getIncoming = useCallback(() => {
    return commentLinkManager.getLinksToComment(commentId)
  }, [commentId])

  const getAll = useCallback(() => {
    return commentLinkManager.getAllLinksForComment(commentId)
  }, [commentId])

  const getRelated = useCallback(() => {
    return commentLinkManager.getRelatedComments(commentId)
  }, [commentId])

  const findDuplicates = useCallback(() => {
    return commentLinkManager.findDuplicates(commentId)
  }, [commentId])

  return {
    createLink,
    getOutgoing,
    getIncoming,
    getAll,
    getRelated,
    findDuplicates,
  }
}

export function useLinkManager() {
  const removeLink = useCallback((linkId: string) => {
    return commentLinkManager.removeLink(linkId)
  }, [])

  const getLinksByType = useCallback((type: any) => {
    return commentLinkManager.getLinksByType(type)
  }, [])

  const getGraph = useCallback(() => {
    return commentLinkManager.getLinkGraph()
  }, [])

  const getStats = useCallback(() => {
    return commentLinkManager.getLinkStats()
  }, [])

  return {
    removeLink,
    getLinksByType,
    getGraph,
    getStats,
  }
}
