/**
 * Comment watching and subscription system
 */

export interface CommentWatch {
  watchId: string
  commentId: string
  userId: string
  watchedAt: number
  notifyOn: ('reply' | 'reaction' | 'resolve' | 'edit')[]
  includeThreads: boolean
}

class CommentWatchingManager {
  private watches: Map<string, CommentWatch> = new Map()
  private nextWatchId = 0

  watchComment(commentId: string, userId: string, notifyOn?: string[], includeThreads = true): CommentWatch {
    const watch: CommentWatch = {
      watchId: `watch-${++this.nextWatchId}`,
      commentId,
      userId,
      watchedAt: Date.now(),
      notifyOn: (notifyOn as any) || ['reply', 'reaction', 'resolve', 'edit'],
      includeThreads
    }

    this.watches.set(watch.watchId, watch)
    return watch
  }

  unwatchComment(watchId: string): boolean {
    return this.watches.delete(watchId)
  }

  isWatching(commentId: string, userId: string): boolean {
    return Array.from(this.watches.values()).some(w => w.commentId === commentId && w.userId === userId)
  }

  getWatchesForUser(userId: string): CommentWatch[] {
    return Array.from(this.watches.values())
      .filter(w => w.userId === userId)
      .sort((a, b) => b.watchedAt - a.watchedAt)
  }

  getWatchesForComment(commentId: string): CommentWatch[] {
    return Array.from(this.watches.values())
      .filter(w => w.commentId === commentId)
  }

  shouldNotify(watchId: string, eventType: string): boolean {
    const watch = this.watches.get(watchId)
    if (!watch) return false
    return watch.notifyOn.includes(eventType as any)
  }

  updateNotificationPreferences(watchId: string, notifyOn: string[]): CommentWatch | null {
    const watch = this.watches.get(watchId)
    if (!watch) return null

    watch.notifyOn = notifyOn as any
    return watch
  }

  getWatchStats(): {
    totalWatches: number
    watchedComments: Set<string>
    userCount: number
  } {
    const watched = new Set<string>()
    const users = new Set<string>()

    this.watches.forEach(w => {
      watched.add(w.commentId)
      users.add(w.userId)
    })

    return {
      totalWatches: this.watches.size,
      watchedComments: watched,
      userCount: users.size
    }
  }

  getMostWatchedComments(limit = 10): Array<{commentId: string, watchCount: number}> {
    const watchCounts = new Map<string, number>()

    this.watches.forEach(watch => {
      watchCounts.set(watch.commentId, (watchCounts.get(watch.commentId) || 0) + 1)
    })

    return Array.from(watchCounts.entries())
      .map(([commentId, watchCount]) => ({commentId, watchCount}))
      .sort((a, b) => b.watchCount - a.watchCount)
      .slice(0, limit)
  }

  getActiveWatchers(commentId: string): string[] {
    return Array.from(this.watches.values())
      .filter(w => w.commentId === commentId)
      .map(w => w.userId)
  }

  unwatchAll(commentId: string): number {
    let count = 0
    const toDelete: string[] = []

    this.watches.forEach((watch, watchId) => {
      if (watch.commentId === commentId) {
        toDelete.push(watchId)
      }
    })

    toDelete.forEach(watchId => {
      if (this.watches.delete(watchId)) count++
    })

    return count
  }
}

export const commentWatchingManager = new CommentWatchingManager()
