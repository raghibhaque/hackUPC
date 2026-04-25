import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ReconciliationResult } from './types'

import UploadPanel from './components/Upload/UploadPanel'
import EquivalenceGraph from './components/Graph/EquivalenceGraph'
import MappingTable from './components/Mapping/MappingTable'
import ConflictReport from './components/Conflicts/ConflictReport'
import MigrationScaffold from './components/CodeGen/MigrationScaffold'
import AnalyticsView from './components/Analytics/AnalyticsView'

type Tab = 'mappings' | 'analytics' | 'graph' | 'conflicts' | 'migration'

const TABS: { id: Tab; label: string }[] = [
  { id: 'mappings',   label: 'Mappings'   },
  { id: 'analytics',  label: 'Analytics'  },
  { id: 'graph',      label: 'Graph'      },
  { id: 'conflicts',  label: 'Conflicts'  },
  { id: 'migration',  label: 'Migration'  },
]

export default function App() {
  const [result, setResult] = useState<ReconciliationResult | undefined>()
  const [activeTab, setActiveTab] = useState<Tab>('mappings')

  const handleReset = () => {
    setResult(undefined)
    setActiveTab('mappings')
  }

  return (
    <div className="min-h-screen bg-[#06060e] text-white/90">
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
            className="min-h-screen"
          >
            {/* Compact header */}
            <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#06060e]/80 backdrop-blur-xl">
              <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-indigo-400 shadow-[0_0_8px_2px_rgba(129,140,248,0.4)]" />
                  <span className="text-sm font-semibold tracking-wide text-white/80">
                    SchemaSync
                  </span>
                  <span className="text-white/20">·</span>
                  <span className="text-xs text-white/40">
                    {result.summary.tables_matched} tables matched
                  </span>
                </div>

                <button
                  onClick={handleReset}
                  className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/50 transition-all hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white/80"
                >
                  ← New analysis
                </button>
              </div>
            </header>

            {/* Tab strip */}
            <div className="border-b border-white/[0.06]">
              <div className="mx-auto max-w-6xl px-6">
                <div className="flex gap-1">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="relative px-4 py-3.5 text-sm font-medium transition-colors"
                    >
                      <span className={activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'}>
                        {tab.label}
                      </span>
                      {activeTab === tab.id && (
                        <motion.div
                          layoutId="tab-indicator"
                          className="absolute bottom-0 left-0 right-0 h-px bg-indigo-400"
                          transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tab content */}
            <div className="mx-auto max-w-6xl px-6 py-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'mappings'   && <MappingTable result={result} />}
                  {activeTab === 'analytics'  && <AnalyticsView result={result} />}
                  {activeTab === 'graph'      && <EquivalenceGraph result={result} />}
                  {activeTab === 'conflicts'  && <ConflictReport result={result} />}
                  {activeTab === 'migration'  && <MigrationScaffold result={result} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
