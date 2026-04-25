import { motion } from 'framer-motion'
import { Lightbulb, Check, X, ArrowRight } from 'lucide-react'
import type { TableMapping } from '../../types'
import { useSmartSuggestions } from '../../hooks/useSmartSuggestions'

interface Props {
  mapping: TableMapping
  onAcceptSuggestion: (sourceCol: string, targetCol: string) => void
}

export default function SmartSuggestionsPanel({ mapping, onAcceptSuggestion }: Props) {
  const suggestions = useSmartSuggestions(mapping)

  if (suggestions.length === 0) {
    return null
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'from-emerald-500/20 to-emerald-500/10 border-emerald-500/30'
    if (score >= 0.6) return 'from-blue-500/20 to-blue-500/10 border-blue-500/30'
    if (score >= 0.4) return 'from-amber-500/20 to-amber-500/10 border-amber-500/30'
    return 'from-white/[0.08] to-white/[0.04] border-white/[0.1]'
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500/20 text-emerald-300'
    if (score >= 0.6) return 'bg-blue-500/20 text-blue-300'
    if (score >= 0.4) return 'bg-amber-500/20 text-amber-300'
    return 'bg-white/[0.08] text-white/60'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="rounded-lg border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 p-4 space-y-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-indigo-400" />
        <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
          Smart Suggestions ({suggestions.length})
        </h4>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion, i) => (
          <motion.div
            key={`${suggestion.sourceCol}-${suggestion.targetCol}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.05 }}
            className={`rounded-lg border bg-gradient-to-r p-3 transition-all hover:shadow-lg ${getScoreColor(
              suggestion.score
            )}`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <code className="text-xs font-semibold text-indigo-300 truncate">{suggestion.sourceCol}</code>
                <ArrowRight className="h-3 w-3 text-white/40 flex-shrink-0" />
                <code className="text-xs font-semibold text-violet-300 truncate">{suggestion.targetCol}</code>
              </div>
              <div className={`flex-shrink-0 px-2 py-0.5 rounded text-xs font-medium ${getScoreBadgeColor(suggestion.score)}`}>
                {(suggestion.score * 100).toFixed(0)}%
              </div>
            </div>

            {suggestion.reasons.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {suggestion.reasons.map((reason, j) => (
                  <span key={j} className="text-[10px] bg-white/[0.08] text-white/60 rounded px-1.5 py-0.5">
                    {reason}
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 pt-1">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onAcceptSuggestion(suggestion.sourceCol, suggestion.targetCol)}
                className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
              >
                <Check className="h-3 w-3" />
                Accept
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center justify-center gap-1 px-2 py-1 rounded text-xs font-medium text-white/40 hover:text-white/60 transition-colors"
              >
                <X className="h-3 w-3" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
