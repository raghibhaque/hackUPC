import { useCallback } from 'react'
import { commentCache } from '../lib/commentCaching'

export function useCommentCache() {
  const set = useCallback((key: string, data: any) => commentCache.set(key, data), [])
  const get = useCallback((key: string) => commentCache.get(key), [])
  const clear = useCallback(() => commentCache.clear(), [])
  return {set, get, clear}
}
