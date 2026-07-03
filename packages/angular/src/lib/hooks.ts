import type { ToolType, ViewportState } from "@adraw/core"
import { inject } from "@angular/core"

import { CanvasService } from "./canvas.service"

// Injectable "hooks" mirroring the useCanvas/useTool/useViewport/useHistory/
// useSelection surface shared by every adraw adapter. Each must be called in
// an Angular injection context (a constructor or field initializer) so
// inject() can resolve the CanvasService provided by provideCanvas().
//
// Reactive values are returned as Angular signals — Angular's reactivity
// primitive, the analog of Solid's accessors — so read them by calling them
// (e.g. `tool()`), including inside templates.

export function useCanvas(): CanvasService {
  return inject(CanvasService)
}

export function useTool() {
  const canvas = inject(CanvasService)
  return {
    setTool: (tool: ToolType) => canvas.setTool(tool),
    tool: canvas.activeTool,
  }
}

export function useViewport() {
  const canvas = inject(CanvasService)
  return {
    resetZoom: () => canvas.resetZoom(),
    setViewport: (viewport: ViewportState) => canvas.setViewport(viewport),
    viewport: canvas.viewport,
    zoomIn: () => canvas.zoomIn(),
    zoomOut: () => canvas.zoomOut(),
    zoomToFit: () => canvas.zoomToFit(),
  }
}

export function useHistory() {
  const canvas = inject(CanvasService)
  return {
    canRedo: canvas.canRedo,
    canUndo: canvas.canUndo,
    redo: () => canvas.redo(),
    undo: () => canvas.undo(),
  }
}

export function useSelection() {
  const canvas = inject(CanvasService)
  return {
    clearSelection: () => canvas.clearSelection(),
    deleteSelected: () => canvas.deleteSelected(),
    elements: canvas.elements,
    selectAll: () => canvas.selectAll(),
    selectedIds: canvas.selectedIds,
  }
}
