import { useEffect, useRef, useCallback } from 'react'

interface UsePollingOptions {
  interval?: number // milliseconds
  enabled?: boolean
  onError?: (error: Error) => void
}

type PollingFn = () => Promise<void> | void

export function usePolling(
  fn: PollingFn,
  options: UsePollingOptions = {}
) {
  const { interval = 2000, enabled = true, onError } = options
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const isPollingRef = useRef(enabled)

  useEffect(() => {
    isPollingRef.current = enabled
  }, [enabled])

  const poll = useCallback(async () => {
    if (!isPollingRef.current) return

    try {
      await fn()
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error)
      }
    }

    if (isPollingRef.current) {
      timeoutRef.current = setTimeout(poll, interval)
    }
  }, [fn, interval, onError])

  useEffect(() => {
    if (enabled) {
      timeoutRef.current = setTimeout(poll, 0)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [enabled, poll])

  const stop = useCallback(() => {
    isPollingRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const start = useCallback(() => {
    isPollingRef.current = true
    timeoutRef.current = setTimeout(poll, 0)
  }, [poll])

  return { stop, start }
}
