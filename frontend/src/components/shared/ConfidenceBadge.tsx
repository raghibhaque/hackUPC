import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  value: number // 0-1 confidence score
  size?: 'sm' | 'md' | 'lg'
  showPercent?: boolean
}

export default function ConfidenceBadge({ value, size = 'md', showPercent = true }: Props) {
  const pct = value * 100

  // 5-level granularity
  const level =
    pct >= 90 ? 'excellent' :
    pct >= 80 ? 'very-good' :
    pct >= 60 ? 'good' :
    pct >= 40 ? 'fair' :
    'poor'

  const config = {
    excellent:  { label: 'Excellent',   border: 'border-emerald-500/40', bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10', text: 'text-emerald-200', dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]' },
    'very-good': { label: 'Very good',  border: 'border-cyan-500/40',    bg: 'bg-gradient-to-br from-cyan-500/20 to-cyan-600/10',    text: 'text-cyan-200',    dot: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]'   },
    good:       { label: 'Good',        border: 'border-amber-500/40',   bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',   text: 'text-amber-200',   dot: 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]'  },
    fair:       { label: 'Fair',        border: 'border-orange-500/40',  bg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10',  text: 'text-orange-200',  dot: 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]' },
    poor:       { label: 'Poor',        border: 'border-rose-500/40',    bg: 'bg-gradient-to-br from-rose-500/20 to-rose-600/10',    text: 'text-rose-200',    dot: 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'   },
  }

  const c = config[level as keyof typeof config]

  const sizeClass = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-sm',
    lg: 'px-4.5 py-2 text-base',
  }[size]

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className={cn(
        'inline-flex items-center gap-2 rounded-lg border backdrop-blur-sm transition-all',
        sizeClass,
        c.border,
        c.bg
      )}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className={cn('h-2 w-2 rounded-full', c.dot)}
      />
      <span className={cn('font-semibold', c.text)}>
        {showPercent ? `${pct.toFixed(0)}%` : c.label}
      </span>
    </motion.div>
  )
}
