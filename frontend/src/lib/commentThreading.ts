/**
 * Comment threading depth tracking and hierarchy insights
 */

import type { CommentThread, Comment } from './comments'

export interface ThreadNode {
  comment: Comment
  depth: number
  childCount: number
  children: ThreadNode[]
}

export interface ThreadMetrics {
  threadId: string
  rootComment: Comment
  depth: number
  totalComments: number
  replies: Comment[]
  longestPath: number
  avgBranchingFactor: number
  resolutionDepth: number | null
  engagement: number
}

class CommentThreadingAnalyzer {
  buildThreadTree(thread: CommentThread): ThreadNode {
    const rootNode: ThreadNode = {
      comment: thread.root,
      depth: 0,
      childCount: thread.replies.length,
      children: thread.replies.map(reply => ({
        comment: reply,
        depth: 1,
        childCount: 0,
        children: []
      }))
    }

    return rootNode
  }

  getThreadMetrics(thread: CommentThread): ThreadMetrics {
    const allComments = [thread.root, ...thread.replies]
    const resolved = allComments.find(c => c.is_resolved)

    return {
      threadId: thread.root.id,
      rootComment: thread.root,
      depth: 1 + (thread.replies.length > 0 ? 1 : 0),
      totalComments: allComments.length,
      replies: thread.replies,
      longestPath: this.calculateLongestPath(thread),
      avgBranchingFactor: this.calculateBranchingFactor(thread),
      resolutionDepth: resolved ? (resolved.reply_to ? 1 : 0) : null,
      engagement: this.calculateEngagement(allComments)
    }
  }

  private calculateLongestPath(thread: CommentThread): number {
    let max = 1
    if (thread.replies.length > 0) {
      max = 2
    }
    return max
  }

  private calculateBranchingFactor(thread: CommentThread): number {
    return thread.replies.length > 0 ? thread.replies.length : 1
  }

  private calculateEngagement(comments: Comment[]): number {
    let score = 0
    score += comments.length * 10
    score += comments.filter(c => c.is_resolved).length * 20
    score += comments.reduce((sum, c) => {
      return sum + Object.values(c.reactions).reduce((s, users) => s + users.length, 0)
    }, 0) * 5

    return Math.min(100, score)
  }

  getThreadsByDepth(threads: CommentThread[]): Map<number, CommentThread[]> {
    const byDepth = new Map<number, CommentThread[]>()

    threads.forEach(thread => {
      const depth = 1 + (thread.replies.length > 0 ? 1 : 0)
      if (!byDepth.has(depth)) {
        byDepth.set(depth, [])
      }
      byDepth.get(depth)!.push(thread)
    })

    return byDepth
  }

  getThreadsByEngagement(threads: CommentThread[]): CommentThread[] {
    return threads
      .map(thread => ({thread, engagement: this.getThreadMetrics(thread).engagement}))
      .sort((a, b) => b.engagement - a.engagement)
      .map(item => item.thread)
  }

  getAverageThreadMetrics(threads: CommentThread[]): {
    avgDepth: number
    avgComments: number
    avgEngagement: number
    avgReplyRatio: number
  } {
    if (threads.length === 0) {
      return {avgDepth: 0, avgComments: 0, avgEngagement: 0, avgReplyRatio: 0}
    }

    let totalDepth = 0
    let totalComments = 0
    let totalEngagement = 0
    let totalReplies = 0

    threads.forEach(thread => {
      const metrics = this.getThreadMetrics(thread)
      totalDepth += metrics.depth
      totalComments += metrics.totalComments
      totalEngagement += metrics.engagement
      totalReplies += thread.replies.length
    })

    return {
      avgDepth: totalDepth / threads.length,
      avgComments: totalComments / threads.length,
      avgEngagement: totalEngagement / threads.length,
      avgReplyRatio: totalReplies / threads.length
    }
  }

  getDeepestThread(threads: CommentThread[]): CommentThread | null {
    if (threads.length === 0) return null

    let deepest = threads[0]
    let maxDepth = this.getThreadMetrics(deepest).depth

    threads.forEach(thread => {
      const depth = this.getThreadMetrics(thread).depth
      if (depth > maxDepth) {
        maxDepth = depth
        deepest = thread
      }
    })

    return deepest
  }

  getMostEngagedThread(threads: CommentThread[]): CommentThread | null {
    if (threads.length === 0) return null

    let mostEngaged = threads[0]
    let maxEngagement = this.getThreadMetrics(mostEngaged).engagement

    threads.forEach(thread => {
      const engagement = this.getThreadMetrics(thread).engagement
      if (engagement > maxEngagement) {
        maxEngagement = engagement
        mostEngaged = thread
      }
    })

    return mostEngaged
  }

  getThreadActivityTimeline(thread: CommentThread): Array<{timestamp: number, count: number}> {
    const allComments = [thread.root, ...thread.replies]
    const timeline: Array<{timestamp: number, count: number}> = []

    const sortedByTime = allComments.sort((a, b) => a.created_at - b.created_at)

    sortedByTime.forEach((comment, idx) => {
      timeline.push({
        timestamp: comment.created_at,
        count: idx + 1
      })
    })

    return timeline
  }

  getThreadHierarchyDepth(threads: CommentThread[]): number {
    let maxDepth = 1

    threads.forEach(thread => {
      const depth = this.getThreadMetrics(thread).depth
      if (depth > maxDepth) {
        maxDepth = depth
      }
    })

    return maxDepth
  }
}

export const commentThreadingAnalyzer = new CommentThreadingAnalyzer()
