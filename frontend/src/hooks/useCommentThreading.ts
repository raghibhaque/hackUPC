import { useMemo } from 'react'
import { commentThreadingAnalyzer } from '../lib/commentThreading'
import type { CommentThread } from '../lib/comments'

export function useCommentThreading(threads: CommentThread[]) {
  const threadMetrics = useMemo(() => {
    return threads.map(thread => commentThreadingAnalyzer.getThreadMetrics(thread))
  }, [threads])

  const threadsByDepth = useMemo(() => {
    return commentThreadingAnalyzer.getThreadsByDepth(threads)
  }, [threads])

  const threadsByEngagement = useMemo(() => {
    return commentThreadingAnalyzer.getThreadsByEngagement(threads)
  }, [threads])

  const averageMetrics = useMemo(() => {
    return commentThreadingAnalyzer.getAverageThreadMetrics(threads)
  }, [threads])

  const deepestThread = useMemo(() => {
    return commentThreadingAnalyzer.getDeepestThread(threads)
  }, [threads])

  const mostEngagedThread = useMemo(() => {
    return commentThreadingAnalyzer.getMostEngagedThread(threads)
  }, [threads])

  const hierarchyDepth = useMemo(() => {
    return commentThreadingAnalyzer.getThreadHierarchyDepth(threads)
  }, [threads])

  return {
    threadMetrics,
    threadsByDepth,
    threadsByEngagement,
    averageMetrics,
    deepestThread,
    mostEngagedThread,
    hierarchyDepth,
  }
}

export function useThreadMetrics(thread: CommentThread) {
  const metrics = useMemo(() => {
    return commentThreadingAnalyzer.getThreadMetrics(thread)
  }, [thread])

  const timeline = useMemo(() => {
    return commentThreadingAnalyzer.getThreadActivityTimeline(thread)
  }, [thread])

  const treeStructure = useMemo(() => {
    return commentThreadingAnalyzer.buildThreadTree(thread)
  }, [thread])

  return {
    metrics,
    timeline,
    treeStructure,
  }
}
