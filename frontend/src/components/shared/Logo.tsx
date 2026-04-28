import { cn } from '@/lib/utils'

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  wordmark?: boolean
  className?: string
  iconClassName?: string
}

const SIZE = {
  xs: { icon: 18, text: 'text-xs',  gap: 'gap-1.5' },
  sm: { icon: 24, text: 'text-sm',  gap: 'gap-2'   },
  md: { icon: 32, text: 'text-base',gap: 'gap-2.5' },
  lg: { icon: 48, text: 'text-2xl', gap: 'gap-3'   },
  xl: { icon: 64, text: 'text-3xl', gap: 'gap-4'   },
}

export default function Logo({ size = 'sm', wordmark = true, className, iconClassName }: LogoProps) {
  const s = SIZE[size]
  return (
    <span className={cn('inline-flex items-center', s.gap, className)}>
      <LogoMark size={s.icon} className={iconClassName} />
      {wordmark && (
        <span className={cn(
          s.text,
          'font-bold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent select-none',
        )}>
          Schema<span className="bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent">Sync</span>
        </span>
      )}
    </span>
  )
}

export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-1 -1 34 34"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      aria-label="SchemaSync logo"
    >
      <defs>
        <linearGradient id="ss-g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="ss-g2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id="ss-g3" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Left cylinder — body */}
      <rect x="4" y="8.5" width="13" height="10" rx="0.5" fill="url(#ss-g2)" opacity="0.8" />
      {/* Left cylinder — top cap */}
      <ellipse cx="10.5" cy="8.5" rx="6.5" ry="2.2" fill="url(#ss-g1)" />
      {/* Left cylinder — bottom cap */}
      <ellipse cx="10.5" cy="18.5" rx="6.5" ry="2.2" fill="url(#ss-g1)" opacity="0.7" />
      {/* Left cylinder — inner highlight */}
      <ellipse cx="10.5" cy="8.5" rx="4" ry="1.1" fill="white" opacity="0.12" />

      {/* Right cylinder — body (smaller, offset right+down) */}
      <rect x="17" y="14" width="11" height="8.5" rx="0.5" fill="url(#ss-g2)" opacity="0.65" />
      {/* Right cylinder — top cap */}
      <ellipse cx="22.5" cy="14" rx="5.5" ry="1.9" fill="url(#ss-g1)" opacity="0.9" />
      {/* Right cylinder — bottom cap */}
      <ellipse cx="22.5" cy="22.5" rx="5.5" ry="1.9" fill="url(#ss-g1)" opacity="0.6" />
      {/* Right cylinder — inner highlight */}
      <ellipse cx="22.5" cy="14" rx="3.2" ry="0.9" fill="white" opacity="0.12" />

      {/* Sync arrow arc */}
      <path
        d="M13.5 21.5 Q14.5 26.5 19.5 26"
        stroke="url(#ss-g3)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Arrowhead */}
      <path
        d="M18.2 24.1 L20.8 25.9 L19.2 28"
        stroke="url(#ss-g3)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
