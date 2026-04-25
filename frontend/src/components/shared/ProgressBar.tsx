import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  value: number // 0-100
  label?: string
  color?: 'indigo' | 'cyan' | 'amber' | 'rose' | 'emerald' | 'violet'
}

const colorMap = {
  indigo: 'from-indigo-500 to-indigo-600',
  cyan: 'from-cyan-500 to-cyan-600',
  amber: 'from-amber-500 to-amber-600',
  rose: 'from-rose-500 to-rose-600',
  emerald: 'from-emerald-500 to-emerald-600',
  violet: 'from-violet-500 to-violet-600',
}

export default function ProgressBar({ value, label, color = 'indigo' }: Props) {
  return (
    <div className="space-y-2">
      {label && (
        <div className="flex justify-between">
          <span className="text-sm font-medium text-white/70">{label}</span>
          <motion.span
            key={Math.round(value)}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className="text-sm font-semibold text-white/60"
          >
            {Math.round(value)}%
          </motion.span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={cn(
            'h-full bg-gradient-to-r shadow-[0_0_12px_rgba(99,102,241,0.3)] rounded-full',
            `${colorMap[color] as string}`
          )}
        />
      </div>
    </div>
  )
}
