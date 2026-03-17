import type { CanvasElement, ElementId } from "./types"

export interface HistoryEntry {
  elements: Map<ElementId, CanvasElement>
  selectedIds: Set<ElementId>
  timestamp: number
}

export interface HistoryState {
  undoStack: HistoryEntry[]
  redoStack: HistoryEntry[]
  maxSize: number
}

export function createHistoryState(maxSize: number = 100): HistoryState {
  return {
    undoStack: [],
    redoStack: [],
    maxSize,
  }
}

export function pushHistory(
  state: HistoryState,
  elements: Map<ElementId, CanvasElement>,
  selectedIds: Set<ElementId>,
): HistoryState {
  const entry: HistoryEntry = {
    elements: new Map(elements),
    selectedIds: new Set(selectedIds),
    timestamp: Date.now(),
  }

  const newUndoStack = [...state.undoStack, entry]

  if (newUndoStack.length > state.maxSize) {
    newUndoStack.shift()
  }

  return {
    undoStack: newUndoStack,
    redoStack: [],
    maxSize: state.maxSize,
  }
}

export function undo(
  state: HistoryState,
  currentElements: Map<ElementId, CanvasElement>,
  currentSelectedIds: Set<ElementId>,
): {
  state: HistoryState
  elements: Map<ElementId, CanvasElement>
  selectedIds: Set<ElementId>
} | null {
  if (state.undoStack.length === 0) {
    return null
  }

  const newUndoStack = [...state.undoStack]
  const lastEntry = newUndoStack.pop()!

  const currentEntry: HistoryEntry = {
    elements: new Map(currentElements),
    selectedIds: new Set(currentSelectedIds),
    timestamp: Date.now(),
  }

  return {
    state: {
      undoStack: newUndoStack,
      redoStack: [...state.redoStack, currentEntry],
      maxSize: state.maxSize,
    },
    elements: lastEntry.elements,
    selectedIds: lastEntry.selectedIds,
  }
}

export function redo(
  state: HistoryState,
  currentElements: Map<ElementId, CanvasElement>,
  currentSelectedIds: Set<ElementId>,
): {
  state: HistoryState
  elements: Map<ElementId, CanvasElement>
  selectedIds: Set<ElementId>
} | null {
  if (state.redoStack.length === 0) {
    return null
  }

  const newRedoStack = [...state.redoStack]
  const lastEntry = newRedoStack.pop()!

  const currentEntry: HistoryEntry = {
    elements: new Map(currentElements),
    selectedIds: new Set(currentSelectedIds),
    timestamp: Date.now(),
  }

  return {
    state: {
      undoStack: [...state.undoStack, currentEntry],
      redoStack: newRedoStack,
      maxSize: state.maxSize,
    },
    elements: lastEntry.elements,
    selectedIds: lastEntry.selectedIds,
  }
}

export function canUndo(state: HistoryState): boolean {
  return state.undoStack.length > 0
}

export function canRedo(state: HistoryState): boolean {
  return state.redoStack.length > 0
}

export function clearHistory(state: HistoryState): HistoryState {
  return {
    ...state,
    undoStack: [],
    redoStack: [],
  }
}
