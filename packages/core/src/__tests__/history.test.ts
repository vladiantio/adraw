import { beforeEach, describe, expect, it } from "vitest"

import {
  canRedo,
  canUndo,
  createHistoryState,
  pushHistory,
  redo,
  undo,
} from "../history"
import type { CanvasElement, ElementId } from "../types"

describe("history", () => {
  let elements: Map<ElementId, CanvasElement>
  let selectedIds: Set<ElementId>

  beforeEach(() => {
    elements = new Map()
    selectedIds = new Set()
  })

  describe("createHistoryState", () => {
    it("creates empty history state", () => {
      const state = createHistoryState()

      expect(state.undoStack).toHaveLength(0)
      expect(state.redoStack).toHaveLength(0)
      expect(state.maxSize).toBe(100)
    })

    it("respects custom max size", () => {
      const state = createHistoryState(50)

      expect(state.maxSize).toBe(50)
    })
  })

  describe("pushHistory", () => {
    it("adds entry to undo stack", () => {
      const state = createHistoryState()
      const newState = pushHistory(state, elements, selectedIds)

      expect(newState.undoStack).toHaveLength(1)
    })

    it("clears redo stack on new action", () => {
      let state = createHistoryState()
      // baseline + a change, so there is something to undo/redo
      state = pushHistory(state, elements, selectedIds)
      state = pushHistory(state, elements, selectedIds)
      state = undo(state, elements, selectedIds)!.state
      expect(state.redoStack).toHaveLength(1)

      state = pushHistory(state, elements, selectedIds)

      expect(state.redoStack).toHaveLength(0)
    })

    it("maintains max size limit", () => {
      let state = createHistoryState(3)

      for (let i = 0; i < 5; i++) {
        state = pushHistory(state, elements, selectedIds)
      }

      expect(state.undoStack).toHaveLength(3)
    })
  })

  describe("undo/redo", () => {
    it("undo restores the previous committed state", () => {
      let state = createHistoryState()
      const withTest = new Map([["test", { id: "test" } as CanvasElement]])

      // baseline (empty) then a change that adds "test"
      state = pushHistory(state, elements, selectedIds)
      state = pushHistory(state, withTest, selectedIds)

      const result = undo(state, withTest, selectedIds)

      expect(result).not.toBeNull()
      // undoing the change goes back to the empty baseline
      expect(result!.elements.get("test")).toBeUndefined()
      expect(result!.elements.size).toBe(0)
    })

    it("redo re-applies the undone state", () => {
      let state = createHistoryState()
      const withTest = new Map([["test", { id: "test" } as CanvasElement]])

      state = pushHistory(state, elements, selectedIds)
      state = pushHistory(state, withTest, selectedIds)
      state = undo(state, withTest, selectedIds)!.state

      const result = redo(state, elements, selectedIds)

      expect(result).not.toBeNull()
      expect(result!.elements.get("test")).toBeDefined()
    })

    it("returns null when only the baseline remains", () => {
      let state = createHistoryState()
      state = pushHistory(state, elements, selectedIds)
      const result = undo(state, elements, selectedIds)

      expect(result).toBeNull()
    })

    it("returns null when nothing to undo", () => {
      const state = createHistoryState()
      const result = undo(state, elements, selectedIds)

      expect(result).toBeNull()
    })

    it("returns null when nothing to redo", () => {
      const state = createHistoryState()
      const result = redo(state, elements, selectedIds)

      expect(result).toBeNull()
    })
  })

  describe("canUndo/canRedo", () => {
    it("canUndo returns false for empty stack", () => {
      const state = createHistoryState()

      expect(canUndo(state)).toBe(false)
    })

    it("canUndo returns false with only the baseline entry", () => {
      let state = createHistoryState()
      state = pushHistory(state, elements, selectedIds)

      expect(canUndo(state)).toBe(false)
    })

    it("canUndo returns true after a change on top of the baseline", () => {
      let state = createHistoryState()
      state = pushHistory(state, elements, selectedIds)
      state = pushHistory(state, elements, selectedIds)

      expect(canUndo(state)).toBe(true)
    })

    it("canRedo returns false for empty stack", () => {
      const state = createHistoryState()

      expect(canRedo(state)).toBe(false)
    })

    it("canRedo returns true after undo", () => {
      let state = createHistoryState()
      state = pushHistory(state, elements, selectedIds)
      state = pushHistory(state, elements, selectedIds)
      state = undo(state, elements, selectedIds)!.state

      expect(canRedo(state)).toBe(true)
    })
  })
})
