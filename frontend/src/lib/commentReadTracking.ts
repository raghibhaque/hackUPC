export class CommentReadTracker {
  private reads = new Map<string, Set<string>>()

  markAsRead(commentId: string, userId: string): void {
    if (!this.reads.has(commentId)) this.reads.set(commentId, new Set())
    this.reads.get(commentId)!.add(userId)
  }

  isRead(commentId: string, userId: string): boolean {
    return this.reads.get(commentId)?.has(userId) || false
  }

  getReaderCount(commentId: string): number {
    return this.reads.get(commentId)?.size || 0
  }
}

export const commentReadTracker = new CommentReadTracker()
