import { motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import type { ConflictPattern } from '../../hooks/useConflictPatterns'

interface Props {
  patterns: ConflictPattern[]
  onApplyResolution: (patternId: string, resolution: string) => void
  onApplyAll: (resolutions: Record<string, string>) => void
}

export default function BatchConflictResolutionPanel({ patterns, onApplyResolution, onApplyAll }: Props) {
  if (patterns.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center"
      >
        <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-emerald-300">All conflicts resolved!</p>
      </motion.div>
    )
  }

  const autoResolvablePatterns = patterns.filter(p => p.autoResolvable)
  const totalAffectedMappings = patterns.reduce((sum, p) => sum + p.affectedMappings.length, 0)

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'from-emerald-500/20 to-emerald-500/10 border-emerald-500/30'
      case 'medium':
        return 'from-amber-500/20 to-amber-500/10 border-amber-500/30'
      case 'high':
        return 'from-rose-500/20 to-rose-500/10 border-rose-500/30'
      default:
        return 'from-white/[0.08] to-white/[0.04] border-white/[0.1]'
    }
  }

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'low':
        return '✓'
      case 'medium':
        return '⚠️'
      case 'high':
        return '🚨'
      default:
        return '•'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Summary Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-lg border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 p-4"
      >
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider">Conflict Patterns</p>
            <p className="text-2xl font-bold text-indigo-300 mt-1">{patterns.length}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider">Affected Mappings</p>
            <p className="text-2xl font-bold text-violet-300 mt-1">{totalAffectedMappings}</p>
          </div>
          <div>
            <p className="text-xs text-white/50 uppercase tracking-wider">Auto-Resolvable</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{autoResolvablePatterns.length}</p>
          </div>
        </div>

        {autoResolvablePatterns.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const resolutions: Record<string, string> = {}
              autoResolvablePatterns.forEach(p => {
                resolutions[p.id] = p.suggestedResolution
              })
              onApplyAll(resolutions)
            }}
            className="mt-4 w-full px-4 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium text-sm transition-all"
          >
            <Zap className="h-4 w-4 inline mr-2" />
            Auto-Resolve {autoResolvablePatterns.length} Pattern{autoResolvablePatterns.length !== 1 ? 's' : ''}
          </motion.button>
        )}
      </motion.div>

      {/* Conflict Patterns */}
      <div className="space-y-3">
        {patterns.map((pattern, i) => (
          <motion.div
            key={pattern.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`rounded-lg border bg-gradient-to-r p-4 transition-all hover:shadow-lg ${getRiskColor(pattern.riskLevel)}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl flex-shrink-0">{getRiskIcon(pattern.riskLevel)}</div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white mb-1">{pattern.description}</h4>
                <p className="text-xs text-white/60">{pattern.count} mapping{pattern.count !== 1 ? 's' : ''} affected</p>
              </div>
              {pattern.autoResolvable ? (
                <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-300 flex-shrink-0">
                  Auto-resolvable
                </span>
              ) : (
                <span className="px-2 py-1 rounded text-xs bg-amber-500/20 text-amber-300 flex-shrink-0">
                  Manual review
                </span>
              )}
            </div>

            {/* Suggested Resolution */}
            <div className="mb-3 p-2 rounded bg-white/[0.05] border border-white/[0.05]">
              <p className="text-xs text-white/50 mb-1">Suggested Resolution</p>
              <code className="text-xs font-mono text-indigo-300 break-words">{pattern.suggestedResolution}</code>
            </div>

            {/* Affected Mappings Preview */}
            <details className="cursor-pointer">
              <summary className="text-xs font-medium text-white/60 hover:text-white/80 transition-colors">
                Show {pattern.affectedMappings.length} affected mapping{pattern.affectedMappings.length !== 1 ? 's' : ''}
              </summary>
              <div className="mt-2 space-y-1 pl-2 border-l border-white/[0.1]">
                {pattern.affectedMappings.slice(0, 5).map((mapping, j) => (
                  <p key={j} className="text-xs text-white/50">
                    {mapping.tableA}.{mapping.colA} → {mapping.tableB}.{mapping.colB}
                  </p>
                ))}
                {pattern.affectedMappings.length > 5 && (
                  <p className="text-xs text-white/40 italic">+{pattern.affectedMappings.length - 5} more</p>
                )}
              </div>
            </details>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              {pattern.autoResolvable && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onApplyResolution(pattern.id, pattern.suggestedResolution)}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3 inline mr-1" />
                  Apply Resolution
                </motion.button>
              )}
              {!pattern.autoResolvable && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-1 px-3 py-1.5 rounded text-xs font-medium bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-colors"
                >
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  Review Manually
                </motion.button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
