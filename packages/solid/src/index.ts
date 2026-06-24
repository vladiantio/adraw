import {
  AdrawCanvas,
  Canvas as CoreCanvas,
  type CanvasElement,
  type CanvasOptions,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import { createSignal } from "solid-js"

export interface CanvasSolidOptions extends CanvasOptions {
  initialViewport?: ViewportState
}

export function createCanvas(options?: CanvasSolidOptions) {
  const core = new CoreCanvas(options)

  const [elements, setElements] = createSignal<Map<ElementId, CanvasElement>>(
    core.getElements(),
  )
  const [viewport, setViewport] = createSignal<ViewportState>(
    core.getViewport(),
  )
  const [activeTool, setActiveTool] = createSignal<ToolType>(
    core.getActiveTool(),
  )
  const [selectedIds, setSelectedIds] = createSignal<Set<ElementId>>(
    core.getSelectedIds(),
  )

  core.on("change", ({ elements: newElements }) => {
    setElements(new Map(newElements))
  })

  core.on("viewportChange", ({ viewport: newViewport }) => {
    setViewport(newViewport)
  })

  core.on("toolChange", ({ tool }) => {
    setActiveTool(tool)
  })

  core.on("selectionChange", ({ selectedIds: newSelectedIds }) => {
    setSelectedIds(new Set(newSelectedIds))
  })

  return {
    activeTool,
    core,
    elements,
    selectedIds,
    viewport,
  }
}

let globalCanvas: ReturnType<typeof createCanvas> | null = null

export function useCanvas() {
  return globalCanvas
}

export function useTool() {
  const canvas = useCanvas()

  return {
    setTool: (tool: ToolType) => {
      canvas?.core.setActiveTool(tool)
    },
    get tool() {
      return canvas?.activeTool() || "select"
    },
  }
}

export function useViewport() {
  const canvas = useCanvas()

  return {
    resetZoom: () => canvas?.core.resetZoom(),
    setViewport: (viewport: ViewportState) => {
      canvas?.core.setViewport(viewport)
    },
    get viewport() {
      return canvas?.viewport() || { x: 0, y: 0, zoom: 1 }
    },
    zoomIn: () => canvas?.core.zoomIn(),
    zoomOut: () => canvas?.core.zoomOut(),
    zoomToFit: () => canvas?.core.zoomToFit(),
  }
}

export function useHistory() {
  const canvas = useCanvas()

  return {
    canRedo: () => canvas?.core.canRedo() ?? false,
    canUndo: () => canvas?.core.canUndo() ?? false,
    redo: () => canvas?.core.redo() ?? false,
    undo: () => canvas?.core.undo() ?? false,
  }
}

export function useSelection() {
  const canvas = useCanvas()

  return {
    clearSelection: () => canvas?.core.clearSelection(),
    deleteSelected: () => canvas?.core.deleteSelected(),
    get elements() {
      return canvas?.elements() || new Map()
    },
    selectAll: () => canvas?.core.selectAll(),
    get selectedIds() {
      return canvas?.selectedIds() || new Set()
    },
  }
}

export function initCanvas(container: HTMLElement) {
  globalCanvas = createCanvas()
  const vanilla = new AdrawCanvas({ container })
  vanilla.render()
  return vanilla
}
