export interface SentimentScore {
  positive: number
  neutral: number
  negative: number
  dominant: 'positive' | 'neutral' | 'negative'
}

class CommentSentimentAnalyzer {
  private positiveWords = new Set(['good', 'great', 'excellent', 'approved', 'perfect', 'amazing', 'better', 'approve'])
  private negativeWords = new Set(['bad', 'poor', 'terrible', 'awful', 'issue', 'problem', 'error', 'fail', 'reject', 'wrong'])

  analyzeSentiment(text: string): SentimentScore {
    const lowerText = text.toLowerCase()
    let positive = 0
    let negative = 0

    this.positiveWords.forEach(word => {
      const count = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
      positive += count
    })

    this.negativeWords.forEach(word => {
      const count = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
      negative += count
    })

    const total = positive + negative
    const normalized = {
      positive: total > 0 ? positive / total : 0.33,
      negative: total > 0 ? negative / total : 0.33,
      neutral: total > 0 ? (total - positive - negative) / total : 0.34
    }

    return {
      positive: normalized.positive,
      neutral: normalized.neutral,
      negative: normalized.negative,
      dominant: normalized.positive > normalized.negative ? 'positive' : normalized.negative > normalized.positive ? 'negative' : 'neutral'
    }
  }

  batchAnalyze(texts: string[]): SentimentScore[] {
    return texts.map(text => this.analyzeSentiment(text))
  }

  getAverageSentiment(sentiments: SentimentScore[]): SentimentScore {
    if (sentiments.length === 0) {
      return {positive: 0.33, neutral: 0.34, negative: 0.33, dominant: 'neutral'}
    }

    const avg = {
      positive: sentiments.reduce((sum, s) => sum + s.positive, 0) / sentiments.length,
      neutral: sentiments.reduce((sum, s) => sum + s.neutral, 0) / sentiments.length,
      negative: sentiments.reduce((sum, s) => sum + s.negative, 0) / sentiments.length
    }

    return {
      ...avg,
      dominant: avg.positive > avg.negative ? 'positive' : avg.negative > avg.positive ? 'negative' : 'neutral'
    }
  }
}

export const commentSentimentAnalyzer = new CommentSentimentAnalyzer()
