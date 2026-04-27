import { useState, useCallback, useMemo } from 'react'
import { commentSearchEngine, type CommentFilter } from '../lib/commentSearch'
import type { CommentThread } from '../lib/comments'

export function useCommentSearch(threads: CommentThread[]) {
  const [filters, setFilters] = useState<CommentFilter>({})
  const [searchText, setSearchText] = useState('')

  const filteredThreads = useMemo(() => {
    return commentSearchEngine.searchComments(threads, {
      ...filters,
      searchText: searchText || undefined
    })
  }, [threads, filters, searchText])

  const stats = useMemo(() => {
    return commentSearchEngine.getCommentStats(filteredThreads)
  }, [filteredThreads])

  const authors = useMemo(() => {
    return commentSearchEngine.getUniqueAuthors(threads)
  }, [threads])

  const mostReacted = useMemo(() => {
    return commentSearchEngine.getMostReactedComments(filteredThreads, 5)
  }, [filteredThreads])

  const mostActive = useMemo(() => {
    return commentSearchEngine.getMostActiveAuthors(threads, 5)
  }, [threads])

  const updateFilter = useCallback((key: keyof CommentFilter, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchText('')
  }, [])

  const toggleResolved = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      isResolved: prev.isResolved === undefined ? true : undefined
    }))
  }, [])

  const toggleUnresolved = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      isResolved: prev.isResolved === false ? undefined : false
    }))
  }, [])

  return {
    filteredThreads,
    searchText,
    setSearchText,
    filters,
    updateFilter,
    clearFilters,
    toggleResolved,
    toggleUnresolved,
    stats,
    authors,
    mostReacted,
    mostActive,
  }
}
