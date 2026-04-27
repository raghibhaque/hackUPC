export class RateLimiter {
  private userCounts = new Map<string, {count: number, resetTime: number}>()
  private readonly maxPerMinute = 10

  canPostComment(userId: string): boolean {
    const now = Date.now()
    const data = this.userCounts.get(userId)

    if (!data || data.resetTime < now) {
      this.userCounts.set(userId, {count: 0, resetTime: now + 60000})
      return true
    }

    return data.count < this.maxPerMinute
  }

  recordComment(userId: string): void {
    const data = this.userCounts.get(userId)
    if (data) data.count++
  }

  getRemaining(userId: string): number {
    const data = this.userCounts.get(userId)
    return Math.max(0, this.maxPerMinute - (data?.count || 0))
  }
}

export const rateLimiter = new RateLimiter()
