import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle, Info, Link2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConflictExplanations, getConflictSeverityColor, getConflictSeverityBg, ConflictData } from '../../hooks/useConflictExplanations'

interface Props {
  conflict: ConflictData
  onAccept?: () => void
  onReview?: () => void
}

export default function ConflictExplanationPanel({
  conflict,
  onAccept,
  onReview,
}: Props) {
  const explanation = useConflictExplanations(conflict)

  if (!explanation) {
    return (
      <div className="text-center py-6 text-white/50 text-sm">
        No detailed explanation available for this conflict.
      </div>
    )
  }

  const SeverityIcon = {
    critical: AlertTriangle,
    warning: AlertTriangle,
    info: Info,
  }[explanation.severity]

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className={cn(
        'rounded-lg border p-4',
        getConflictSeverityBg(explanation.severity),
      )}>
        <div className="flex items-start gap-3">
          <SeverityIcon className={cn('h-5 w-5 shrink-0 mt-0.5', getConflictSeverityColor(explanation.severity))} />
          <div className="flex-1">
            <h3 className={cn('font-bold', getConflictSeverityColor(explanation.severity))}>
              {explanation.title}
            </h3>
            <p className="text-xs text-white/70 mt-1">
              {explanation.rootCause}
            </p>
          </div>
        </div>
      </div>

      {/* Examples */}
      {explanation.examples && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-4 space-y-2"
        >
          <p className="text-xs font-semibold text-white/70">Example:</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-black/30 rounded p-2">
              <p className="text-[10px] text-white/50 mb-1">Before</p>
              <code className="text-xs text-cyan-300 font-mono block break-words">
                {explanation.examples.before}
              </code>
            </div>
            <div className="bg-black/30 rounded p-2">
              <p className="text-[10px] text-white/50 mb-1">After</p>
              <code className="text-xs text-emerald-300 font-mono block break-words">
                {explanation.examples.after}
              </code>
            </div>
          </div>
        </motion.div>
      )}

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="space-y-2"
      >
        <p className="text-xs font-semibold text-white/70">Recommendations:</p>
        {explanation.recommendations.map((rec, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-white/40" />
                <h4 className="font-semibold text-sm text-white/90">{rec.title}</h4>
              </div>
              <span className="text-[10px] font-bold text-emerald-300 px-2 py-1 bg-emerald-500/20 rounded">
                {(rec.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>

            <p className="text-xs text-white/60">
              {rec.description}
            </p>

            <div className="ml-6 space-y-1">
              <p className="text-[10px] font-semibold text-white/50">Steps:</p>
              <ol className="list-decimal ml-4 space-y-1">
                {rec.steps.map((step, j) => (
                  <li key={j} className="text-xs text-white/60">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Related Mappings */}
      {explanation.relatedMappings && explanation.relatedMappings.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="h-4 w-4 text-blue-300" />
            <p className="text-xs font-semibold text-blue-300">Related Mappings</p>
          </div>
          <div className="space-y-1">
            {explanation.relatedMappings.map((mapping, i) => (
              <div key={i} className="flex items-center justify-between text-xs text-white/70">
                <span>{mapping.tableName}</span>
                <span className="text-blue-300 font-semibold">
                  {(mapping.confidence * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      {(onAccept || onReview) && (
        <div className="flex gap-2 pt-2">
          {onReview && (
            <button
              onClick={onReview}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded border border-white/20 hover:bg-white/[0.08] transition-colors text-white/70 hover:text-white/90"
            >
              Review Details
            </button>
          )}
          {onAccept && (
            <button
              onClick={onAccept}
              className="flex-1 px-3 py-2 text-xs font-semibold rounded bg-emerald-500/20 border border-emerald-500/40 hover:bg-emerald-500/30 transition-colors text-emerald-300 hover:text-emerald-200"
            >
              Accept Resolution
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}
