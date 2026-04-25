import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Variants } from 'framer-motion'
import { FileText, ArrowRight, Loader2, Database, Upload } from 'lucide-react'
import type { ReconciliationResult } from '../../types'
import { apiClient } from '../../lib/api'
import { showToast } from '../../lib/toast'
import { ElegantShape } from '../ui/shape-landing-hero'
import { cn } from '@/lib/utils'

type Props = { onResult: (r: ReconciliationResult) => void }

const EASE: [number, number, number, number] = [0.25, 0.4, 0.25, 1]

const fadeUp = (i: number): Variants => ({
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: 0.4 + i * 0.12, ease: EASE },
  },
})

export default function UploadPanel({ onResult }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [targetFile, setTargetFile] = useState<File | null>(null)

  const sourceRef = useRef<HTMLInputElement>(null)
  const targetRef = useRef<HTMLInputElement>(null)

  const run = async (fn: () => Promise<ReconciliationResult>) => {
    setIsLoading(true)
    setError(null)
    try {
      onResult(await fn())
      showToast('Reconciliation complete!', 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong'
      setError(message)
      showToast(message, 'error')
      setIsLoading(false)
    }
  }

  const handleDemo = () => {
    showToast('Loading demo data...', 'info', 1500)
    run(() => apiClient.runDemo())
  }

  const handleReconcile = () => {
    if (!sourceFile || !targetFile) return
    showToast('Uploading files...', 'info', 2000)
    run(async () => {
      const [a, b] = await Promise.all([
        apiClient.uploadFile(sourceFile),
        apiClient.uploadFile(targetFile),
      ])
      return apiClient.reconcileFiles(a, b)
    })
  }

  const canReconcile = sourceFile && targetFile && !isLoading

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#06060e] flex flex-col items-center justify-center">

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-600/[0.04] via-transparent to-violet-600/[0.04]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(99,102,241,0.08),transparent)]" />

      {/* Floating shapes */}
      <ElegantShape delay={0.2} width={560} height={130} rotate={12}  gradient="from-indigo-500/[0.12]" className="left-[-8%] top-[18%]" />
      <ElegantShape delay={0.4} width={420} height={100} rotate={-14} gradient="from-violet-500/[0.12]" className="right-[-4%] top-[65%]" />
      <ElegantShape delay={0.3} width={260} height={70}  rotate={-7}  gradient="from-indigo-400/[0.1]"  className="left-[8%] bottom-[12%]" />
      <ElegantShape delay={0.5} width={180} height={50}  rotate={22}  gradient="from-rose-400/[0.08]"   className="right-[18%] top-[10%]" />
      <ElegantShape delay={0.6} width={120} height={36}  rotate={-20} gradient="from-cyan-400/[0.08]"   className="left-[28%] top-[6%]" />

      {/* Subtle grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '60px 60px' }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-6 py-16">

        {/* Badge */}
        <motion.div
          variants={fadeUp(0)} initial="hidden" animate="visible"
          className="mb-10 flex justify-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
            </span>
            <span className="text-xs font-medium tracking-widest text-white/50 uppercase">SchemaSync</span>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div variants={fadeUp(1)} initial="hidden" animate="visible" className="mb-4 text-center">
          <h1 className="text-5xl font-bold leading-[1.1] tracking-tight">
            <span className="bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent">
              Reconcile your
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-white/90 to-violet-300 bg-clip-text text-transparent">
              database schemas
            </span>
          </h1>
        </motion.div>

        <motion.p
          variants={fadeUp(2)} initial="hidden" animate="visible"
          className="mb-12 text-center text-sm leading-relaxed text-white/40"
        >
          ML-powered structural + semantic matching. Maps tables and columns across any two SQL schemas in seconds.
        </motion.p>

        {/* Error */}
        <AnimatePresence>
          {error && <AnimateError error={error} onDismiss={() => setError(null)} />}
        </AnimatePresence>

        {/* Demo CTA */}
        <motion.div variants={fadeUp(3)} initial="hidden" animate="visible" className="mb-8">
          <button
            onClick={handleDemo}
            disabled={isLoading}
            className="group relative w-full overflow-hidden rounded-xl border border-indigo-500/30 bg-indigo-600/10 px-5 py-3.5 text-sm font-medium text-indigo-300 backdrop-blur-sm transition-all hover:border-indigo-400/50 hover:bg-indigo-600/20 hover:text-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Running reconciliation…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Database className="h-4 w-4" />
                Run demo — Ghost vs WordPress
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            )}
          </button>
        </motion.div>

        {/* Divider */}
        <motion.div variants={fadeUp(4)} initial="hidden" animate="visible" className="mb-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/25">or upload your own</span>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </motion.div>

        {/* File upload */}
        <motion.div variants={fadeUp(5)} initial="hidden" animate="visible" className="space-y-3">
          <input ref={sourceRef} type="file" accept=".sql" className="hidden"
            onChange={e => setSourceFile(e.target.files?.[0] ?? null)} />
          <input ref={targetRef} type="file" accept=".sql" className="hidden"
            onChange={e => setTargetFile(e.target.files?.[0] ?? null)} />

          <div className="grid grid-cols-2 gap-3">
            <FilePicker
              label="Source schema"
              file={sourceFile}
              accent="indigo"
              disabled={isLoading}
              onClick={() => sourceRef.current?.click()}
            />
            <FilePicker
              label="Target schema"
              file={targetFile}
              accent="violet"
              disabled={isLoading}
              onClick={() => targetRef.current?.click()}
            />
          </div>

          <motion.button
            whileHover={canReconcile ? { scale: 1.02, y: -1 } : {}}
            whileTap={canReconcile ? { scale: 0.98 } : {}}
            onClick={handleReconcile}
            disabled={!canReconcile}
            className={cn(
              'relative w-full overflow-hidden rounded-xl border px-5 py-3.5 text-sm font-semibold transition-all',
              canReconcile
                ? 'border-white/[0.15] bg-gradient-to-r from-white/[0.08] to-white/[0.04] text-white shadow-[0_8px_32px_rgba(255,255,255,0.1)] hover:border-white/[0.25] hover:shadow-[0_12px_48px_rgba(255,255,255,0.15)]'
                : 'cursor-not-allowed border-white/[0.04] bg-white/[0.02] text-white/20'
            )}
          >
            {isLoading ? (
              <motion.span
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="flex items-center justify-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Reconciling…
              </motion.span>
            ) : (
              <span className="relative flex items-center justify-center gap-2">
                <span>Reconcile schemas</span>
                <motion.span
                  initial={{ x: 0 }}
                  whileHover={canReconcile ? { x: 4 } : {}}
                >
                  <ArrowRight className="h-4 w-4" />
                </motion.span>
              </span>
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#06060e] to-transparent" />
    </div>
  )
}

function FilePicker({
  label, file, accent, disabled, onClick,
}: {
  label: string
  file: File | null
  accent: 'indigo' | 'violet'
  disabled: boolean
  onClick: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)

  const colors = {
    indigo: { active: 'border-indigo-500/40 bg-indigo-500/[0.07] text-indigo-300', icon: 'text-indigo-400' },
    violet: { active: 'border-violet-500/40 bg-violet-500/[0.07] text-violet-300', icon: 'text-violet-400' },
  }
  const c = colors[accent]

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      const file = files[0]
      if (file.name.endsWith('.sql')) {
        onClick()
        // Trigger file input with dropped file
        const input = (e.currentTarget as any).querySelector('input[type="file"]')
        if (input) {
          const dt = new DataTransfer()
          dt.items.add(file)
          input.files = dt.files
          const event = new Event('change', { bubbles: true })
          input.dispatchEvent(event)
        }
      } else {
        showToast('Please drop a .sql file', 'error')
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all',
        isDragging
          ? 'border-white/[0.3] bg-white/[0.08] ring-2 ring-white/[0.1]'
          : file ? c.active : 'border-white/[0.07] bg-white/[0.03] text-white/30 hover:border-white/[0.12] hover:bg-white/[0.05]',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <motion.div
        animate={{ scale: isDragging ? 1.1 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {isDragging ? (
          <Upload className="h-5 w-5 text-white/40" />
        ) : (
          <FileText className={cn('h-5 w-5', file ? c.icon : 'text-white/20')} />
        )}
      </motion.div>
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wider opacity-60">
          {isDragging ? 'Drop file here' : label}
        </p>
        <p className="mt-0.5 max-w-full truncate text-xs font-medium">
          {file ? file.name : '.sql file'}
        </p>
      </div>
    </button>
  )
}

function AnimateError({ error, onDismiss }: { error: string | null; onDismiss: () => void }) {
  if (!error) return null
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="mb-6 overflow-hidden rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3"
    >
      <p className="text-sm text-rose-300">{error}</p>
      <button onClick={onDismiss} className="mt-1 text-xs text-rose-400/60 underline hover:text-rose-400">
        Dismiss
      </button>
    </motion.div>
  )
}
