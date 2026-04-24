import { useState } from 'react'
import { UploadState, AnalysisState, ReconciliationResult } from '@/types'
import UploadPanel from '@/components/Upload/UploadPanel'
import EquivalenceGraph from '@/components/Graph/EquivalenceGraph'
import MappingTable from '@/components/Mapping/MappingTable'
import ConflictReport from '@/components/Conflicts/ConflictReport'
import MigrationScaffold from '@/components/CodeGen/MigrationScaffold'

export default function App() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isLoading: false,
  })

  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    activeTab: 'mappings',
    isExporting: false,
  })

  const handleAnalysisComplete = (result: ReconciliationResult) => {
    setAnalysisState((prev) => ({
      ...prev,
      result,
    }))
  }

  const handleTabChange = (
    tab: 'mappings' | 'graph' | 'conflicts' | 'migration'
  ) => {
    setAnalysisState((prev) => ({
      ...prev,
      activeTab: tab,
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">SchemaSync</h1>
              <p className="text-sm text-slate-600">
                Automated database schema reconciliation
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!analysisState.result ? (
          // Upload phase
          <div className="grid gap-8">
            <div className="rounded-lg bg-white p-8 shadow-sm">
              <h2 className="mb-6 text-xl font-semibold text-slate-900">
                Upload Schemas
              </h2>
              <UploadPanel
                state={uploadState}
                onStateChange={setUploadState}
                onComplete={handleAnalysisComplete}
              />
            </div>
          </div>
        ) : (
          // Results phase
          <div className="grid gap-8">
            {/* Tab navigation */}
            <div className="rounded-lg bg-white shadow-sm">
              <div className="flex border-b border-slate-200">
                {(
                  [
                    'mappings',
                    'graph',
                    'conflicts',
                    'migration',
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => handleTabChange(tab)}
                    className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                      analysisState.activeTab === tab
                        ? 'border-b-2 border-blue-600 text-blue-600'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="p-6">
                {analysisState.activeTab === 'mappings' && (
                  <MappingTable result={analysisState.result} />
                )}
                {analysisState.activeTab === 'graph' && (
                  <EquivalenceGraph result={analysisState.result} />
                )}
                {analysisState.activeTab === 'conflicts' && (
                  <ConflictReport result={analysisState.result} />
                )}
                {analysisState.activeTab === 'migration' && (
                  <MigrationScaffold result={analysisState.result} />
                )}
              </div>
            </div>

            {/* Reset button */}
            <div className="flex justify-center">
              <button
                onClick={() => {
                  setAnalysisState({ activeTab: 'mappings', isExporting: false })
                  setUploadState({ isLoading: false })
                }}
                className="rounded-lg bg-slate-200 px-6 py-2 text-sm font-medium text-slate-900 hover:bg-slate-300 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-600">
        <p>
          SchemaSync © 2026 | Turning weeks of schema mapping into seconds
        </p>
      </footer>
    </div>
  )
}
