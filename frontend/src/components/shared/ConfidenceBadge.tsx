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
    excellent:  { label: 'Excellent',   border: 'border-emerald-500/30', bg: 'bg-emerald-500/15', text: 'text-emerald-300', dot: 'bg-emerald-400' },
    'very-good': { label: 'Very good',  border: 'border-cyan-500/30',    bg: 'bg-cyan-500/15',    text: 'text-cyan-300',    dot: 'bg-cyan-400'   },
    good:       { label: 'Good',        border: 'border-amber-500/30',   bg: 'bg-amber-500/15',   text: 'text-amber-300',   dot: 'bg-amber-400'  },
    fair:       { label: 'Fair',        border: 'border-orange-500/30',  bg: 'bg-orange-500/15',  text: 'text-orange-300',  dot: 'bg-orange-400' },
    poor:       { label: 'Poor',        border: 'border-rose-500/30',    bg: 'bg-rose-500/15',    text: 'text-rose-300',    dot: 'bg-rose-400'   },
  }

  const c = config[level as keyof typeof config]

  const sizeClass = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  }[size]

  return (
    <div className={cn(
      'inline-flex items-center gap-2 rounded-lg border',
      sizeClass,
      c.border,
      c.bg
    )}>
      <div className={cn('h-2 w-2 rounded-full', c.dot)} />
      <span className={cn('font-medium', c.text)}>
        {showPercent ? `${pct.toFixed(1)}%` : c.label}
      </span>
    </div>
  )
}
