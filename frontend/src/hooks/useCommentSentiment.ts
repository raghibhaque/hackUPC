import { useMemo } from 'react'
import { commentSentimentAnalyzer } from '../lib/commentSentiment'
import type { CommentThread } from '../lib/comments'

export function useCommentSentiment(text: string) {
  const sentiment = useMemo(() => {
    return commentSentimentAnalyzer.analyzeSentiment(text)
  }, [text])

  return sentiment
}

export function useThreadSentiment(threads: CommentThread[]) {
  const sentiments = useMemo(() => {
    const allTexts = threads.flatMap(t => [t.root.content, ...t.replies.map(r => r.content)])
    return commentSentimentAnalyzer.batchAnalyze(allTexts)
  }, [threads])

  const average = useMemo(() => {
    return commentSentimentAnalyzer.getAverageSentiment(sentiments)
  }, [sentiments])

  return {
    sentiments,
    average,
  }
}
