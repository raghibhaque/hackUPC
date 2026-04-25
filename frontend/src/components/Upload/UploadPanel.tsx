import { useState } from 'react'
import type { UploadState } from '../../types'
import { apiClient } from '../../lib/api'

type Props = {
  state: UploadState
  onStateChange: (s: UploadState) => void
  onAnalysisStart: (sessionId: string) => void
}

export default function UploadPanel({ state, onStateChange, onAnalysisStart }: Props) {
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleRunDemo = async () => {
    onStateChange({ isLoading: true })
    setUploadError(null)

    try {
      const response = await apiClient.uploadDemo()
      onStateChange({ isLoading: false })
      onAnalysisStart(response.session_id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start demo'
      setUploadError(message)
      onStateChange({ isLoading: false })
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {uploadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-800">{uploadError}</p>
        </div>
      )}

      <div className="space-y-4">
        <p className="text-slate-600">
          Get started with a pre-loaded demo of Ghost vs WordPress schema reconciliation.
        </p>

        <button
          onClick={handleRunDemo}
          disabled={state.isLoading}
          className={`w-full rounded-lg px-6 py-3 font-medium text-white transition-all ${
            state.isLoading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }`}
        >
          {state.isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0c4.418 0 8 3.582 8 8" />
              </svg>
              Starting reconciliation...
            </span>
          ) : (
            'Run Demo'
          )}
        </button>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <p className="text-sm text-slate-600 mb-4">Or upload your own schemas:</p>
        <div className="rounded-lg border-2 border-dashed border-slate-300 p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-slate-400 mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-slate-600">Coming soon: File upload support</p>
        </div>
      </div>
    </div>
  )
}
