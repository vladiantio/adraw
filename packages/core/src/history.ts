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
    maxSize,
    redoStack: [],
    undoStack: [],
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
    maxSize: state.maxSize,
    redoStack: [],
    undoStack: newUndoStack,
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
  // The top of the undo stack mirrors the current committed state, so undoing
  // requires at least one prior checkpoint underneath it to restore.
  if (state.undoStack.length <= 1) {
    return null
  }

  const newUndoStack = [...state.undoStack]
  newUndoStack.pop()
  const targetEntry = newUndoStack[newUndoStack.length - 1]

  const currentEntry: HistoryEntry = {
    elements: new Map(currentElements),
    selectedIds: new Set(currentSelectedIds),
    timestamp: Date.now(),
  }

  return {
    elements: new Map(targetEntry.elements),
    selectedIds: new Set(targetEntry.selectedIds),
    state: {
      maxSize: state.maxSize,
      redoStack: [...state.redoStack, currentEntry],
      undoStack: newUndoStack,
    },
  }
}

export function redo(
  state: HistoryState,
  _currentElements: Map<ElementId, CanvasElement>,
  _currentSelectedIds: Set<ElementId>,
): {
  state: HistoryState
  elements: Map<ElementId, CanvasElement>
  selectedIds: Set<ElementId>
} | null {
  if (state.redoStack.length === 0) {
    return null
  }

  const newRedoStack = [...state.redoStack]
  const targetEntry = newRedoStack.pop()!

  return {
    elements: new Map(targetEntry.elements),
    selectedIds: new Set(targetEntry.selectedIds),
    state: {
      maxSize: state.maxSize,
      redoStack: newRedoStack,
      // The restored state becomes the new current committed checkpoint.
      undoStack: [...state.undoStack, targetEntry],
    },
  }
}

export function canUndo(state: HistoryState): boolean {
  return state.undoStack.length > 1
}

export function canRedo(state: HistoryState): boolean {
  return state.redoStack.length > 0
}

export function clearHistory(state: HistoryState): HistoryState {
  return {
    ...state,
    redoStack: [],
    undoStack: [],
  }
}
