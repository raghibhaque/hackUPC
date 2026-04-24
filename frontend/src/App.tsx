import { useState } from 'react'
import type { UploadState, AnalysisState, ReconciliationResult } from './types'

import UploadPanel from './components/Upload/UploadPanel'
import EquivalenceGraph from './components/Graph/EquivalenceGraph'
import MappingTable from './components/Mapping/MappingTable'
import ConflictReport from './components/Conflicts/ConflictReport'
import MigrationScaffold from './components/CodeGen/MigrationScaffold'

type Tab = 'mappings' | 'graph' | 'conflicts' | 'migration'

const tabs: Tab[] = ['mappings', 'graph', 'conflicts', 'migration']

export default function App() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isLoading: false,
  })

  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    activeTab: 'mappings',
    isExporting: false,
    result: undefined,
  })

  const handleAnalysisComplete = (result: ReconciliationResult) => {
    setAnalysisState((prev) => ({
      ...prev,
      result,
      activeTab: 'mappings',
    }))
  }

  const handleTabChange = (tab: Tab) => {
    setAnalysisState((prev) => ({
      ...prev,
      activeTab: tab,
    }))
  }

  const handleReset = () => {
    setAnalysisState({
      activeTab: 'mappings',
      isExporting: false,
      result: undefined,
    })

    setUploadState({
      isLoading: false,
    })
  }

  const result = analysisState.result

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 shadow-sm backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-slate-900">SchemaSync</h1>
          <p className="text-sm text-slate-600">
            Automated database schema reconciliation
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {!result ? (
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
        ) : (
          <div className="grid gap-8">
            <div className="rounded-lg bg-white shadow-sm">
              <div className="flex border-b border-slate-200">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
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

              <div className="p-6">
                {analysisState.activeTab === 'mappings' && (
                  <MappingTable result={result} />
                )}

                {analysisState.activeTab === 'graph' && (
                  <EquivalenceGraph />
                )}

                {analysisState.activeTab === 'conflicts' && (
                  <ConflictReport result={result} />
                )}

                {analysisState.activeTab === 'migration' && (
                  <MigrationScaffold result={result} />
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg bg-slate-200 px-6 py-2 text-sm font-medium text-slate-900 transition-colors hover:bg-slate-300"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-600">
        <p>SchemaSync © 2026 | Turning weeks of schema mapping into seconds</p>
      </footer>
    </div>
  )
}