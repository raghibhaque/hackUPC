import { useState, useCallback, useMemo } from 'react'

export interface UndoRedoAction {
  id: string
  type: 'mark_reviewed' | 'mark_unreviewed' | 'bulk_select' | 'conflict_resolved' | 'note_added' | 'rule_applied' | 'template_loaded' | 'filter_applied' | 'snapshot'
  timestamp: number
  description: string
  prevState: any
  newState: any
  metadata?: Record<string, any>
}

interface UndoRedoState {
  past: UndoRedoAction[]
  present: any
  future: UndoRedoAction[]
}

export function useUndoRedo<T>(initialState: T) {
  const MAX_HISTORY = 50

  const [state, setState] = useState<UndoRedoState>({
    past: [],
    present: initialState,
    future: [],
  })

  const push = useCallback((action: Omit<UndoRedoAction, 'id' | 'timestamp'>) => {
    setState(prevState => {
      const newAction: UndoRedoAction = {
        ...action,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
      }

      const newPast = [...prevState.past, newAction].slice(-MAX_HISTORY)

      return {
        past: newPast,
        present: action.newState,
        future: [],
      }
    })
  }, [])

  const undo = useCallback(() => {
    setState(prevState => {
      if (prevState.past.length === 0) return prevState

      const newPast = prevState.past.slice(0, -1)
      const action = prevState.past[prevState.past.length - 1]
      const newFuture = [action, ...prevState.future]

      return {
        past: newPast,
        present: action.prevState,
        future: newFuture,
      }
    })
  }, [])

  const redo = useCallback(() => {
    setState(prevState => {
      if (prevState.future.length === 0) return prevState

      const action = prevState.future[0]
      const newFuture = prevState.future.slice(1)
      const newPast = [...prevState.past, action]

      return {
        past: newPast,
        present: action.newState,
        future: newFuture,
      }
    })
  }, [])

  const canUndo = useMemo(() => state.past.length > 0, [state.past.length])
  const canRedo = useMemo(() => state.future.length > 0, [state.future.length])

  const history = useMemo(() => [...state.past, { type: 'snapshot', description: 'Current State', timestamp: Date.now() } as any], [state.past])

  const clear = useCallback(() => {
    setState({ past: [], present: initialState, future: [] })
  }, [initialState])

  return {
    state: state.present,
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    clear,
    historyIndex: state.past.length,
  }
}
