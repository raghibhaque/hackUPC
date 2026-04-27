/**
 * Bulk action utilities for comments
 */

import { commentStore, type Comment, type CommentThread } from './comments'

class CommentBulkActionsManager {
  markMultipleAsResolved(commentIds: string[]): Map<string, boolean> {
    const results = new Map<string, boolean>()

    commentIds.forEach(id => {
      const result = commentStore.resolveComment(id)
      results.set(id, result !== null)
    })

    return results
  }

  deleteMultiple(commentIds: string[]): Map<string, boolean> {
    const results = new Map<string, boolean>()

    commentIds.forEach(id => {
      const success = commentStore.deleteComment(id)
      results.set(id, success)
    })

    return results
  }

  addReactionToMultiple(commentIds: string[], emoji: string, user: string): Map<string, boolean> {
    const results = new Map<string, boolean>()

    commentIds.forEach(id => {
      const result = commentStore.addReaction(id, emoji, user)
      results.set(id, result !== null)
    })

    return results
  }

  removeReactionFromMultiple(commentIds: string[], emoji: string, user: string): Map<string, boolean> {
    const results = new Map<string, boolean>()

    commentIds.forEach(id => {
      const result = commentStore.removeReaction(id, emoji, user)
      results.set(id, result !== null)
    })

    return results
  }

  getCommentsByAuthor(threads: CommentThread[], author: string): Comment[] {
    const comments: Comment[] = []

    threads.forEach(thread => {
      if (thread.root.author === author) {
        comments.push(thread.root)
      }
      thread.replies.forEach(reply => {
        if (reply.author === author) {
          comments.push(reply)
        }
      })
    })

    return comments
  }

  getUnresolvedComments(threads: CommentThread[]): Comment[] {
    const comments: Comment[] = []

    threads.forEach(thread => {
      if (!thread.root.is_resolved) {
        comments.push(thread.root)
      }
      thread.replies.forEach(reply => {
        if (!reply.is_resolved) {
          comments.push(reply)
        }
      })
    })

    return comments
  }

  getCommentsWithoutReactions(threads: CommentThread[]): Comment[] {
    const comments: Comment[] = []

    threads.forEach(thread => {
      if (Object.keys(thread.root.reactions).length === 0) {
        comments.push(thread.root)
      }
      thread.replies.forEach(reply => {
        if (Object.keys(reply.reactions).length === 0) {
          comments.push(reply)
        }
      })
    })

    return comments
  }

  getCommentsCreatedAfter(threads: CommentThread[], timestamp: number): Comment[] {
    const comments: Comment[] = []

    threads.forEach(thread => {
      if (thread.root.created_at > timestamp) {
        comments.push(thread.root)
      }
      thread.replies.forEach(reply => {
        if (reply.created_at > timestamp) {
          comments.push(reply)
        }
      })
    })

    return comments
  }

  getCommentsCreatedBefore(threads: CommentThread[], timestamp: number): Comment[] {
    const comments: Comment[] = []

    threads.forEach(thread => {
      if (thread.root.created_at < timestamp) {
        comments.push(thread.root)
      }
      thread.replies.forEach(reply => {
        if (reply.created_at < timestamp) {
          comments.push(reply)
        }
      })
    })

    return comments
  }

  selectCommentsByPattern(threads: CommentThread[], patterns: {
    resolved?: boolean
    author?: string
    hasReactions?: boolean
    createdAfter?: number
    createdBefore?: number
  }): Comment[] {
    let comments: Comment[] = []

    threads.forEach(thread => {
      if (this.matchesPattern(thread.root, patterns)) {
        comments.push(thread.root)
      }
      thread.replies.forEach(reply => {
        if (this.matchesPattern(reply, patterns)) {
          comments.push(reply)
        }
      })
    })

    return comments
  }

  private matchesPattern(comment: Comment, patterns: any): boolean {
    if (patterns.resolved !== undefined && comment.is_resolved !== patterns.resolved) {
      return false
    }

    if (patterns.author !== undefined && comment.author !== patterns.author) {
      return false
    }

    if (patterns.hasReactions !== undefined) {
      const hasReactions = Object.keys(comment.reactions).length > 0
      if (hasReactions !== patterns.hasReactions) {
        return false
      }
    }

    if (patterns.createdAfter !== undefined && comment.created_at <= patterns.createdAfter) {
      return false
    }

    if (patterns.createdBefore !== undefined && comment.created_at >= patterns.createdBefore) {
      return false
    }

    return true
  }
}

export const commentBulkActionsManager = new CommentBulkActionsManager()
