import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart3, GitCompare, AlertCircle, Code2, Zap } from 'lucide-react'
import type { ReconciliationResult } from './types'

import UploadPanel from './components/Upload/UploadPanel'
import EquivalenceGraph from './components/Graph/EquivalenceGraph'
import MappingTable from './components/Mapping/MappingTable'
import ConflictReport from './components/Conflicts/ConflictReport'
import MigrationScaffold from './components/CodeGen/MigrationScaffold'
import AnalyticsView from './components/Analytics/AnalyticsView'
import ToastContainer from './components/shared/ToastContainer'
import ShortcutsModal from './components/shared/ShortcutsModal'
import Logo from './components/shared/Logo'

type Tab = 'mappings' | 'analytics' | 'graph' | 'conflicts' | 'migration'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'mappings',   label: 'Mappings',   icon: <GitCompare className="h-4 w-4" /> },
  { id: 'analytics',  label: 'Analytics',  icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'graph',      label: 'Graph',      icon: <Zap className="h-4 w-4" /> },
  { id: 'conflicts',  label: 'Conflicts',  icon: <AlertCircle className="h-4 w-4" /> },
  { id: 'migration',  label: 'Migration',  icon: <Code2 className="h-4 w-4" /> },
]

export default function App() {
  const [result, setResult] = useState<ReconciliationResult | undefined>()
  const [activeTab, setActiveTab] = useState<Tab>('mappings')

  const handleReset = () => {
    setResult(undefined)
    setActiveTab('mappings')
  }

  return (
    <div className="min-h-screen transition-colors duration-300 bg-gradient-to-br from-[#06060e] via-[#0f0f1e] to-[#06060e] text-white/90">
      {/* Premium background layers */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 transition-opacity duration-300 opacity-100 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
        <div className="absolute inset-0 transition-opacity duration-300 opacity-100 bg-[radial-gradient(ellipse_60%_80%_at_100%_100%,rgba(139,92,246,0.06),transparent)]" />
      </div>

      <ToastContainer />
      <ShortcutsModal />
      <AnimatePresence mode="wait">
        {!result ? (
          <motion.div
            key="upload"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
          >
            <UploadPanel onResult={(r) => { setResult(r); setActiveTab('mappings') }} />
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="relative min-h-screen"
          >
            {/* Premium header */}
            <header className="sticky top-0 z-50 transition-colors duration-300 border-b border-white/[0.06] bg-gradient-to-b from-[#06060e]/95 to-[#06060e]/80 backdrop-blur-2xl">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  <Logo size="sm" />
                  <span className="text-white/20">·</span>
                  <span className="text-xs font-medium text-white/50">
                    {result.summary.tables_matched} / {result.summary.tables_in_a} tables mapped
                  </span>
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={handleReset}
                  className="group relative overflow-hidden rounded-lg border border-white/[0.1] bg-white/[0.05] px-3.5 py-2 text-xs font-medium text-white/60 transition-all hover:border-white/[0.15] hover:bg-white/[0.08] hover:text-white/80"
                >
                  <span className="relative flex items-center gap-1.5">
                    ← New analysis
                  </span>
                </motion.button>
              </div>
            </header>

            {/* Tab strip with icons */}
            <div className="transition-colors duration-300 border-b border-white/[0.05] bg-gradient-to-b from-white/[0.02] to-transparent">
              <div className="mx-auto max-w-7xl px-6">
                <div className="flex gap-1">
                  {TABS.map((tab, i) => (
                    <motion.button
                      key={tab.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setActiveTab(tab.id)}
                      className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium transition-all ${
                        activeTab === tab.id
                          ? 'text-white'
                          : 'text-white/50 hover:text-white/70'
                      }`}
                    >
                      {tab.icon}
                      {tab.label}
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-400 to-violet-400"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab content with premium spacing */}
            <div className="relative">
              <div className="mx-auto max-w-7xl px-6 py-10">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.25, 0.4, 0.25, 1] }}
                  >
                    {activeTab === 'mappings'   && <MappingTable result={result} />}
                    {activeTab === 'analytics'  && <AnalyticsView result={result} />}
                    {activeTab === 'graph'      && <EquivalenceGraph result={result} />}
                    {activeTab === 'conflicts'  && <ConflictReport result={result} />}
                    {activeTab === 'migration'  && <MigrationScaffold result={result} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
