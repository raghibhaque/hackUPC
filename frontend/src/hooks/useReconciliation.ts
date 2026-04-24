import { useState, useCallback } from 'react'
import { ReconciliationResult, Schema, ReconcileRequest } from '@/types'
import { apiClient } from '@/api/client'

interface UseReconciliationReturn {
  result: ReconciliationResult | null
  isLoading: boolean
  error: string | null
  reconcile: (sourceSchema: Schema, targetSchema: Schema) => Promise<void>
  reset: () => void
}

export function useReconciliation(): UseReconciliationReturn {
  const [result, setResult] = useState<ReconciliationResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reconcile = useCallback(
    async (sourceSchema: Schema, targetSchema: Schema) => {
      setIsLoading(true)
      setError(null)

      try {
        const request: ReconcileRequest = {
          sourceSchema,
          targetSchema,
          analysisDepth: 'standard',
        }

        const response = await apiClient.reconcile(request)
        setResult(response.result)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to reconcile schemas'
        setError(message)
        console.error('Reconciliation error:', err)
      } finally {
        setIsLoading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
    setIsLoading(false)
  }, [])

  return { result, isLoading, error, reconcile, reset }
}
