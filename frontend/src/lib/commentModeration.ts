/**
 * Comment moderation and filtering system
 */

export interface ModerationFlag {
  flagId: string
  commentId: string
  reason: 'spam' | 'offensive' | 'misinformation' | 'off_topic' | 'other'
  description: string
  flaggedBy: string
  flaggedAt: number
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'
  resolution?: string
}

class CommentModerationManager {
  private flags: Map<string, ModerationFlag> = new Map()
  private nextFlagId = 0
  private blockedUsers: Set<string> = new Set()
  private shadowBannedUsers: Set<string> = new Set()

  flagComment(commentId: string, reason: ModerationFlag['reason'], description: string, flaggedBy: string): ModerationFlag {
    const flag: ModerationFlag = {
      flagId: `flag-${++this.nextFlagId}`,
      commentId,
      reason,
      description,
      flaggedBy,
      flaggedAt: Date.now(),
      status: 'pending'
    }

    this.flags.set(flag.flagId, flag)
    return flag
  }

  reviewFlag(flagId: string, status: 'reviewed' | 'resolved' | 'dismissed', resolution?: string): ModerationFlag | null {
    const flag = this.flags.get(flagId)
    if (!flag) return null

    flag.status = status
    if (resolution) flag.resolution = resolution

    return flag
  }

  getFlagsByComment(commentId: string): ModerationFlag[] {
    return Array.from(this.flags.values())
      .filter(f => f.commentId === commentId)
      .sort((a, b) => b.flaggedAt - a.flaggedAt)
  }

  getFlagsByUser(userId: string): ModerationFlag[] {
    return Array.from(this.flags.values())
      .filter(f => f.flaggedBy === userId)
      .sort((a, b) => b.flaggedAt - a.flaggedAt)
  }

  getPendingFlags(): ModerationFlag[] {
    return Array.from(this.flags.values())
      .filter(f => f.status === 'pending')
      .sort((a, b) => a.flaggedAt - b.flaggedAt)
  }

  blockUser(userId: string): void {
    this.blockedUsers.add(userId)
  }

  unblockUser(userId: string): void {
    this.blockedUsers.delete(userId)
  }

  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId)
  }

  shadowBanUser(userId: string): void {
    this.shadowBannedUsers.add(userId)
  }

  unshadowBanUser(userId: string): void {
    this.shadowBannedUsers.delete(userId)
  }

  isUserShadowBanned(userId: string): boolean {
    return this.shadowBannedUsers.has(userId)
  }

  getBlockedUsers(): string[] {
    return Array.from(this.blockedUsers)
  }

  getShadowBannedUsers(): string[] {
    return Array.from(this.shadowBannedUsers)
  }

  getModeratorQueue(): ModerationFlag[] {
    const pending = this.getPendingFlags()
    return pending.sort((a, b) => {
      const reasonPriority: Record<string, number> = {
        offensive: 5,
        spam: 4,
        misinformation: 3,
        off_topic: 2,
        other: 1
      }
      return (reasonPriority[b.reason] || 0) - (reasonPriority[a.reason] || 0)
    })
  }

  getFlagStats(): {
    totalFlags: number
    byReason: Record<string, number>
    byStatus: Record<string, number>
    blockedUserCount: number
    shadowBannedCount: number
  } {
    const flags = Array.from(this.flags.values())
    const byReason: Record<string, number> = {}
    const byStatus: Record<string, number> = {}

    flags.forEach(flag => {
      byReason[flag.reason] = (byReason[flag.reason] || 0) + 1
      byStatus[flag.status] = (byStatus[flag.status] || 0) + 1
    })

    return {
      totalFlags: flags.length,
      byReason,
      byStatus,
      blockedUserCount: this.blockedUsers.size,
      shadowBannedCount: this.shadowBannedUsers.size
    }
  }

  shouldHideComment(commentAuthorId: string, viewingUserId: string): boolean {
    if (this.isUserBlocked(commentAuthorId)) return true
    if (this.isUserShadowBanned(commentAuthorId) && commentAuthorId !== viewingUserId) return true
    return false
  }
}

export const commentModerationManager = new CommentModerationManager()
