/**
 * Comment search and filtering utilities
 */

import { type Comment, type CommentThread } from './comments'

export type CommentFilter = {
  searchText?: string
  isResolved?: boolean
  hasReactions?: boolean
  hasMentions?: boolean
  author?: string
  dateRange?: {
    start: number
    end: number
  }
}

class CommentSearchEngine {
  searchComments(threads: CommentThread[], filters: CommentFilter): CommentThread[] {
    return threads.filter(thread => {
      const rootMatches = this.commentMatches(thread.root, filters)
      const repliesMatches = thread.replies.filter(reply => this.commentMatches(reply, filters))

      return rootMatches || repliesMatches.length > 0
    }).map(thread => {
      if (!this.commentMatches(thread.root, filters)) {
        return {
          root: thread.root,
          replies: thread.replies.filter(reply => this.commentMatches(reply, filters))
        }
      }
      return thread
    })
  }

  private commentMatches(comment: Comment, filters: CommentFilter): boolean {
    if (filters.searchText) {
      const searchLower = filters.searchText.toLowerCase()
      if (!comment.content.toLowerCase().includes(searchLower) &&
          !comment.author.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    if (filters.isResolved !== undefined) {
      if (comment.is_resolved !== filters.isResolved) {
        return false
      }
    }

    if (filters.hasReactions !== undefined) {
      const hasReactions = Object.keys(comment.reactions).length > 0
      if (hasReactions !== filters.hasReactions) {
        return false
      }
    }

    if (filters.hasMentions !== undefined) {
      const hasMentions = comment.mentions.length > 0
      if (hasMentions !== filters.hasMentions) {
        return false
      }
    }

    if (filters.author && comment.author !== filters.author) {
      return false
    }

    if (filters.dateRange) {
      if (comment.created_at < filters.dateRange.start ||
          comment.created_at > filters.dateRange.end) {
        return false
      }
    }

    return true
  }

  highlightMatches(text: string, searchText: string): Array<{text: string, isMatch: boolean}> {
    if (!searchText || searchText.length === 0) {
      return [{text, isMatch: false}]
    }

    const parts: Array<{text: string, isMatch: boolean}> = []
    const lowerText = text.toLowerCase()
    const lowerSearch = searchText.toLowerCase()
    let lastIndex = 0

    let index = lowerText.indexOf(lowerSearch)
    while (index !== -1) {
      if (index > lastIndex) {
        parts.push({text: text.substring(lastIndex, index), isMatch: false})
      }
      parts.push({text: text.substring(index, index + searchText.length), isMatch: true})
      lastIndex = index + searchText.length
      index = lowerText.indexOf(lowerSearch, lastIndex)
    }

    if (lastIndex < text.length) {
      parts.push({text: text.substring(lastIndex), isMatch: false})
    }

    return parts.length > 0 ? parts : [{text, isMatch: false}]
  }

  getCommentStats(threads: CommentThread[]) {
    let totalComments = 0
    let resolvedCount = 0
    let withReactions = 0
    let withMentions = 0

    threads.forEach(thread => {
      const allComments = [thread.root, ...thread.replies]
      totalComments += allComments.length
      resolvedCount += allComments.filter(c => c.is_resolved).length
      withReactions += allComments.filter(c => Object.keys(c.reactions).length > 0).length
      withMentions += allComments.filter(c => c.mentions.length > 0).length
    })

    return {
      totalComments,
      resolvedCount,
      unresolvedCount: totalComments - resolvedCount,
      withReactions,
      withMentions
    }
  }

  getUniqueAuthors(threads: CommentThread[]): string[] {
    const authors = new Set<string>()
    threads.forEach(thread => {
      authors.add(thread.root.author)
      thread.replies.forEach(reply => authors.add(reply.author))
    })
    return Array.from(authors).sort()
  }

  getMostReactedComments(threads: CommentThread[], limit = 5): Comment[] {
    const allComments: Comment[] = []
    threads.forEach(thread => {
      allComments.push(thread.root, ...thread.replies)
    })

    return allComments
      .sort((a, b) => {
        const aReactionCount = Object.values(a.reactions).reduce((sum, users) => sum + users.length, 0)
        const bReactionCount = Object.values(b.reactions).reduce((sum, users) => sum + users.length, 0)
        return bReactionCount - aReactionCount
      })
      .slice(0, limit)
  }

  getMostActiveAuthors(threads: CommentThread[], limit = 5): Array<{author: string, commentCount: number}> {
    const authorCounts = new Map<string, number>()

    threads.forEach(thread => {
      const increment = (author: string) => {
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1)
      }
      increment(thread.root.author)
      thread.replies.forEach(reply => increment(reply.author))
    })

    return Array.from(authorCounts.entries())
      .map(([author, count]) => ({author, commentCount: count}))
      .sort((a, b) => b.commentCount - a.commentCount)
      .slice(0, limit)
  }
}

export const commentSearchEngine = new CommentSearchEngine()
