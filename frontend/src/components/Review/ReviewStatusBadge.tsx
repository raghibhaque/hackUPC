import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Edit3, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ReviewStatus } from '../../types/review'

interface Props {
  status: ReviewStatus
  compact?: boolean
  showIcon?: boolean
}

const statusConfig = {
  unreviewed: {
    color: 'bg-slate-500/20 border-slate-500/30 text-slate-300',
    icon: Circle,
    label: 'Unreviewed',
  },
  approved: {
    color: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300',
    icon: CheckCircle,
    label: 'Approved',
  },
  rejected: {
    color: 'bg-rose-500/20 border-rose-500/30 text-rose-300',
    icon: XCircle,
    label: 'Rejected',
  },
  modified: {
    color: 'bg-blue-500/20 border-blue-500/30 text-blue-300',
    icon: Edit3,
    label: 'Modified',
  },
}

export default function ReviewStatusBadge({ status, compact = false, showIcon = true }: Props) {
  const config = statusConfig[status]
  const Icon = config.icon

  if (compact) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium', config.color)}
      >
        {showIcon && <Icon className="h-3 w-3" />}
        <span>{config.label}</span>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
        config.color
      )}
    >
      {showIcon && <Icon className="h-4 w-4" />}
      <span className="text-sm font-semibold">{config.label}</span>
    </motion.div>
  )
}
