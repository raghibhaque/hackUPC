import { motion } from 'framer-motion'
import ProgressBar from '../shared/ProgressBar'
import { CheckCircle2, Loader, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  progress: number; // 0-100
  currentPhase: string;
  phaseDescription: string;
}

const PHASES = [
  { id: 'parsing', name: 'Parsing', description: 'Parsing schemas...', icon: '📄' },
  { id: 'structural', name: 'Structural', description: 'Building structural fingerprints...', icon: '🏗️' },
  { id: 'semantic', name: 'Semantic', description: 'Computing semantic similarity...', icon: '🧠' },
  { id: 'reconciliation', name: 'Reconciliation', description: 'Reconciling mappings...', icon: '🔄' },
  { id: 'conflicts', name: 'Conflicts', description: 'Detecting conflicts...', icon: '⚠️' },
  { id: 'codegen', name: 'Generation', description: 'Generating migration scaffold...', icon: '✨' },
]

export default function ProgressTracker({
  progress,
  currentPhase,
  phaseDescription,
}: Props) {
  const currentPhaseIndex = PHASES.findIndex((p) => p.id === currentPhase)
  const isComplete = progress >= 100

  return (
    <div className="space-y-8">
      {/* Main Progress Bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-widest text-white/60">Overall Progress</label>
          <motion.span
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            key={Math.floor(progress / 10)}
            className="text-sm font-bold text-indigo-300"
          >
            {progress}%
          </motion.span>
        </div>
        <ProgressBar value={progress} label="" color="indigo" />
      </motion.div>

      {/* Phase Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative overflow-hidden rounded-lg border border-white/[0.1] bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
      >
        {/* Animated accent */}
        <motion.div
          animate={{ opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute top-0 right-0 -mr-12 -mt-12 h-24 w-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 blur-3xl"
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <motion.h3
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="text-lg font-bold text-white/90 flex items-center gap-2"
            >
              {isComplete ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <span>Reconciliation Complete!</span>
                </>
              ) : (
                <>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}>
                    <Loader className="h-5 w-5 text-indigo-400" />
                  </motion.div>
                  <span>{PHASES.find(p => p.id === currentPhase)?.name}</span>
                </>
              )}
            </motion.h3>
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-sm font-bold bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent"
            >
              {progress}%
            </motion.span>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm text-white/60 leading-relaxed"
          >
            {phaseDescription}
          </motion.p>
        </div>
      </motion.div>

      {/* Phase Timeline */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <div className="text-xs font-bold uppercase tracking-widest text-white/50">
          Phases
        </div>

        <div className="space-y-2.5">
          {PHASES.map((phase, index) => {
            const isActive = phase.id === currentPhase
            const isDone = index < currentPhaseIndex || (index === currentPhaseIndex && progress >= 100)

            return (
              <motion.div
                key={phase.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="flex items-center gap-3.5"
              >
                {/* Circle indicator */}
                <motion.div
                  animate={isActive ? { scale: [1, 1.15, 1] } : {}}
                  transition={isActive ? { duration: 1, repeat: Infinity } : {}}
                  className={cn(
                    'relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-semibold text-sm transition-all',
                    isDone
                      ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_8px_16px_rgba(16,185,129,0.3)]'
                      : isActive
                        ? 'bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-[0_8px_24px_rgba(99,102,241,0.4)] ring-2 ring-indigo-400/30'
                        : 'border border-white/[0.1] bg-white/[0.05] text-white/40'
                  )}
                >
                  {isDone ? (
                    <motion.svg
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </motion.svg>
                  ) : isActive ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    >
                      <Circle className="h-5 w-5" />
                    </motion.div>
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>

                {/* Phase info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{phase.icon}</span>
                    <p
                      className={cn(
                        'font-semibold transition-colors',
                        isActive
                          ? 'text-indigo-300'
                          : isDone
                            ? 'text-emerald-300'
                            : 'text-white/50'
                      )}
                    >
                      {phase.name}
                    </p>
                    {isActive && (
                      <motion.div className="flex gap-1">
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
                        />
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                          className="h-1.5 w-1.5 rounded-full bg-indigo-400"
                        />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{phase.description}</p>
                </div>

                {/* Progress bar for active phase */}
                {isActive && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 }}
                    className="h-1.5 w-16 flex-shrink-0 overflow-hidden rounded-full bg-white/[0.1]"
                  >
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                      animate={{ width: `${((progress % 20) / 20) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </motion.div>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>

      {/* Estimated time */}
      {!isComplete && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-white/40 font-medium"
        >
          <p>Estimated time remaining: ~{Math.max(1, Math.ceil((100 - progress) / 20))} seconds</p>
        </motion.div>
      )}
    </div>
  )
}
