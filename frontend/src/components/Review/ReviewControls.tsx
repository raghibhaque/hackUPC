import { motion } from 'framer-motion'
import { CheckCircle, XCircle, Edit3, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  onApprove: () => void
  onReject: () => void
  onEdit: () => void
  onReset?: () => void
  isReviewed: boolean
  size?: 'sm' | 'md'
}

export default function ReviewControls({
  onApprove,
  onReject,
  onEdit,
  onReset,
  isReviewed,
  size = 'md',
}: Props) {
  const baseClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
  const iconClasses = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'

  const buttons = [
    {
      onClick: onApprove,
      icon: CheckCircle,
      label: 'Approve',
      color: 'text-emerald-400 hover:bg-emerald-500/20 border-emerald-500/20',
      tooltip: 'Approve this mapping (A)',
    },
    {
      onClick: onReject,
      icon: XCircle,
      label: 'Reject',
      color: 'text-rose-400 hover:bg-rose-500/20 border-rose-500/20',
      tooltip: 'Reject this mapping (R)',
    },
    {
      onClick: onEdit,
      icon: Edit3,
      label: 'Edit',
      color: 'text-blue-400 hover:bg-blue-500/20 border-blue-500/20',
      tooltip: 'Edit this mapping (E)',
    },
    ...(isReviewed && onReset
      ? [
          {
            onClick: onReset,
            icon: RotateCcw,
            label: 'Reset',
            color: 'text-gray-400 hover:bg-gray-500/20 border-gray-500/20',
            tooltip: 'Reset to unreviewed',
          },
        ]
      : []),
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex gap-1 items-center"
    >
      {buttons.map((btn, i) => (
        <motion.button
          key={btn.label}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={btn.onClick}
          className={cn(
            'rounded-lg border transition-all',
            baseClasses,
            btn.color,
            'font-medium'
          )}
          title={btn.tooltip}
          type="button"
        >
          <btn.icon className={iconClasses} />
        </motion.button>
      ))}
    </motion.div>
  )
}
