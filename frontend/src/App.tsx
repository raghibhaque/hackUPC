import { useState, useEffect } from 'react'
import type { UploadState, AnalysisState, ReconciliationResult, ReconcileStatusResponse } from './types'
import { apiClient } from './lib/api'

import UploadPanel from './components/Upload/UploadPanel'
import ProgressTracker from './components/Progress/ProgressTracker'
import EquivalenceGraph from './components/Graph/EquivalenceGraph'
import MappingTable from './components/Mapping/MappingTable'
import ConflictReport from './components/Conflicts/ConflictReport'
import MigrationScaffold from './components/CodeGen/MigrationScaffold'

type Tab = 'mappings' | 'graph' | 'conflicts' | 'migration'

const tabs: Tab[] = ['mappings', 'graph', 'conflicts', 'migration']

interface PollingState {
  progress: number
  currentPhase: string
  phaseDescription: string
}

export default function App() {
  const [uploadState, setUploadState] = useState<UploadState>({
    isLoading: false,
  })

  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    activeTab: 'mappings',
    isExporting: false,
    result: undefined,
  })

  const [jobId, setJobId] = useState<string | null>(null)
  const [pollingState, setPollingState] = useState<PollingState>({
    progress: 0,
    currentPhase: 'parsing',
    phaseDescription: 'Parsing schemas...',
  })
  const [error, setError] = useState<string | null>(null)

  // Polling effect
  useEffect(() => {
    if (!jobId) return

    const interval = setInterval(async () => {
      try {
        const response: ReconcileStatusResponse = await apiClient.getReconciliationStatus(jobId)

        setPollingState({
          progress: response.progress,
          currentPhase: response.current_phase,
          phaseDescription: response.phase_description,
        })

        if (response.status === 'complete' && response.result) {
          setAnalysisState((prev) => ({
            ...prev,
            result: response.result as ReconciliationResult,
            activeTab: 'mappings',
          }))
          setJobId(null)
          clearInterval(interval)
        } else if (response.status === 'failed') {
          setError('Reconciliation failed. Please try again.')
          setJobId(null)
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Polling error:', err)
        setError('Lost connection to backend. Please try again.')
        setJobId(null)
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId])

  const handleAnalysisStart = async (newSessionId: string) => {
    setError(null)
    setPollingState({
      progress: 0,
      currentPhase: 'parsing',
      phaseDescription: 'Parsing schemas...',
    })

    try {
      const response = await apiClient.startReconciliation(newSessionId)
      setJobId(response.job_id)
    } catch (err) {
      setError('Failed to start reconciliation. Please try again.')
      console.error(err)
    }
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

    setJobId(null)
    setPollingState({
      progress: 0,
      currentPhase: 'parsing',
      phaseDescription: 'Parsing schemas...',
    })
    setError(null)
  }

  const result = analysisState.result
  const isPolling = jobId !== null

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
        {/* Error Alert */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Progress Tracker - Show while polling */}
        {isPolling && (
          <div className="mb-8 rounded-lg bg-white p-8 shadow-sm">
            <ProgressTracker
              progress={pollingState.progress}
              currentPhase={pollingState.currentPhase}
              phaseDescription={pollingState.phaseDescription}
            />
          </div>
        )}

        {/* Upload Phase - Show when no result and not polling */}
        {!result && !isPolling && (
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-xl font-semibold text-slate-900">
              Upload Schemas
            </h2>

            <UploadPanel
              state={uploadState}
              onStateChange={setUploadState}
              onAnalysisStart={handleAnalysisStart}
            />
          </div>
        )}

        {/* Results Phase - Show when result available */}
        {result && !isPolling && (
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
                  <EquivalenceGraph result={result} />
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
