import { useState, useCallback, useEffect } from 'react'
import { useUndoRedo } from './useUndoRedo'

export interface MappingTableState {
  reviewed: Set<number>
  selectedForBulk: Set<number>
  expanded: Set<number>
  search: string
  minConfidence: number
  showRules: boolean
  showHistory: boolean
  showExport: boolean
  showSettings: boolean
}

export function useMappingStateWithUndo() {
  const initialState: MappingTableState = {
    reviewed: new Set(),
    selectedForBulk: new Set(),
    expanded: new Set(),
    search: '',
    minConfidence: 0,
    showRules: false,
    showHistory: false,
    showExport: false,
    showSettings: false,
  }

  const { state, push, undo, redo, canUndo, canRedo, history, historyIndex, clear } = useUndoRedo(initialState)

  const setReviewed = useCallback((reviewed: Set<number>, description: string) => {
    push({
      type: 'mark_reviewed',
      description,
      prevState: { ...state, reviewed: new Set(state.reviewed) },
      newState: { ...state, reviewed: new Set(reviewed) },
    })
  }, [state, push])

  const setSelectedForBulk = useCallback((selected: Set<number>, description: string) => {
    push({
      type: 'bulk_select',
      description,
      prevState: { ...state, selectedForBulk: new Set(state.selectedForBulk) },
      newState: { ...state, selectedForBulk: new Set(selected) },
    })
  }, [state, push])

  const setExpanded = useCallback((expanded: Set<number>, description: string) => {
    push({
      type: 'snapshot',
      description,
      prevState: { ...state, expanded: new Set(state.expanded) },
      newState: { ...state, expanded: new Set(expanded) },
    })
  }, [state, push])

  const setSearch = useCallback((search: string) => {
    push({
      type: 'filter_applied',
      description: `Search: "${search}"`,
      prevState: { ...state, search: state.search },
      newState: { ...state, search },
    })
  }, [state, push])

  const setMinConfidence = useCallback((minConfidence: number) => {
    push({
      type: 'filter_applied',
      description: `Confidence filter: ${(minConfidence * 100).toFixed(0)}%`,
      prevState: { ...state, minConfidence: state.minConfidence },
      newState: { ...state, minConfidence },
    })
  }, [state, push])

  const createSnapshot = useCallback((description: string) => {
    push({
      type: 'snapshot',
      description,
      prevState: { ...state },
      newState: { ...state },
    })
  }, [state, push])

  return {
    state,
    setReviewed,
    setSelectedForBulk,
    setExpanded,
    setSearch,
    setMinConfidence,
    createSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    history,
    historyIndex,
    clear,
  }
}
