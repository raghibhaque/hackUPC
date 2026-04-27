export class CommentCache {
  private cache = new Map<string, {data: any, timestamp: number}>()
  private readonly ttl = 5 * 60 * 1000

  set(key: string, data: any): void {
    this.cache.set(key, {data, timestamp: Date.now()})
  }

  get(key: string): any {
    const item = this.cache.get(key)
    if (!item || Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key)
      return null
    }
    return item.data
  }

  clear(): void {
    this.cache.clear()
  }
}

export const commentCache = new CommentCache()
