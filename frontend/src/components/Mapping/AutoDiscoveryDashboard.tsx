import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, TrendingUp, Zap } from 'lucide-react'
import type { ReconciliationResult } from '../../types'

interface DiscoveryCard {
  id: string
  title: string
  description: string
  count: number
  icon: React.ReactNode
  color: string
  bgColor: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  action: string
}

interface Props {
  result: ReconciliationResult
  reviewedCount: number
  conflictCount: number
  onApplyQuickFilter: (filterId: string) => void
}

export default function AutoDiscoveryDashboard({
  result,
  reviewedCount,
  conflictCount,
  onApplyQuickFilter,
}: Props) {
  const totalMappings = result.table_mappings?.length ?? 0
  const unreviewed = totalMappings - reviewedCount
  const typeConversionsNeeded = result.table_mappings?.filter(m =>
    m.column_mappings?.some(
      col => col.col_a.data_type?.base_type !== col.col_b.data_type?.base_type
    )
  ).length ?? 0

  const lowConfidenceMappings = result.table_mappings?.filter(m => m.confidence < 0.6).length ?? 0

  const cards: DiscoveryCard[] = [
    {
      id: 'unreviewed',
      title: 'Unreviewed Mappings',
      description: 'Mappings awaiting your review',
      count: unreviewed,
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'text-amber-300',
      bgColor: 'from-amber-500/20 to-amber-500/10',
      priority: unreviewed > 10 ? 'critical' : 'high',
      action: 'Review Now',
    },
    {
      id: 'conflicts',
      title: 'Conflicts Needing Resolution',
      description: 'Mappings with conflicting suggestions',
      count: conflictCount,
      icon: <Zap className="h-5 w-5" />,
      color: 'text-rose-300',
      bgColor: 'from-rose-500/20 to-rose-500/10',
      priority: conflictCount > 5 ? 'critical' : 'high',
      action: 'Resolve Conflicts',
    },
    {
      id: 'type-conversions',
      title: 'Type Conversions Required',
      description: 'Mappings with type mismatches needing conversion',
      count: typeConversionsNeeded,
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-indigo-300',
      bgColor: 'from-indigo-500/20 to-indigo-500/10',
      priority: typeConversionsNeeded > 5 ? 'high' : 'medium',
      action: 'Define Conversions',
    },
    {
      id: 'low-confidence',
      title: 'Low Confidence Mappings',
      description: 'Mappings with confidence below 60%',
      count: lowConfidenceMappings,
      icon: <AlertCircle className="h-5 w-5" />,
      color: 'text-amber-300',
      bgColor: 'from-amber-500/20 to-amber-500/10',
      priority: lowConfidenceMappings > 3 ? 'high' : 'medium',
      action: 'Review Quality',
    },
  ].filter(card => card.count > 0)

  const criticalCards = cards.filter(c => c.priority === 'critical')
  const highCards = cards.filter(c => c.priority === 'high')

  if (cards.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-center"
      >
        <CheckCircle2 className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-emerald-300">All mappings look good! Keep up the great work!</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Priority Section */}
      {criticalCards.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-rose-300 mb-3">
            🚨 Critical - Address First
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {criticalCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-lg border border-rose-500/30 bg-gradient-to-r ${card.bgColor} p-4 transition-all hover:shadow-lg cursor-pointer`}
                onClick={() => onApplyQuickFilter(card.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`${card.color}`}>{card.icon}</div>
                  <span className="text-2xl font-bold text-rose-300">{card.count}</span>
                </div>
                <h4 className="text-sm font-semibold text-white mb-1">{card.title}</h4>
                <p className="text-xs text-white/60 mb-3">{card.description}</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-xs font-medium text-rose-300 hover:text-rose-200 transition-colors"
                >
                  {card.action} →
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* High Priority Section */}
      {highCards.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-300 mb-3">
            ⚠️ High Priority
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {highCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: (criticalCards.length + i) * 0.05 }}
                className={`rounded-lg border border-amber-500/20 bg-gradient-to-r ${card.bgColor} p-3 transition-all hover:shadow-lg cursor-pointer`}
                onClick={() => onApplyQuickFilter(card.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className={`${card.color} text-lg`}>{card.icon}</div>
                  <span className="text-xl font-bold text-amber-300">{card.count}</span>
                </div>
                <h4 className="text-xs font-semibold text-white mb-1">{card.title}</h4>
                <p className="text-[10px] text-white/50 mb-2 line-clamp-2">{card.description}</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-[10px] font-medium text-amber-300 hover:text-amber-200 transition-colors"
                >
                  {card.action} →
                </motion.button>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-white/[0.1] bg-white/[0.03] p-3"
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-white/50">Reviewed:</span>
              <span className="ml-2 font-semibold text-emerald-300">
                {reviewedCount}/{totalMappings}
              </span>
            </div>
            <div className="w-px h-4 bg-white/[0.1]" />
            <div>
              <span className="text-white/50">Completion:</span>
              <span className="ml-2 font-semibold text-indigo-300">
                {totalMappings > 0 ? ((reviewedCount / totalMappings) * 100).toFixed(0) : 0}%
              </span>
            </div>
          </div>
          <div className="h-1.5 w-32 rounded-full bg-white/[0.08] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-indigo-500"
              initial={{ width: 0 }}
              animate={{ width: `${totalMappings > 0 ? (reviewedCount / totalMappings) * 100 : 0}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
