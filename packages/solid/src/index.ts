import {
  type CanvasElement,
  type CanvasOptions,
  Canvas as CoreCanvas,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import { VanillaCanvas } from "@adraw/vanilla"
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
    core,
    elements,
    viewport,
    activeTool,
    selectedIds,
  }
}

let globalCanvas: ReturnType<typeof createCanvas> | null = null

export function useCanvas() {
  return globalCanvas
}

export function useTool() {
  const canvas = useCanvas()

  return {
    get tool() {
      return canvas?.activeTool() || "select"
    },
    setTool: (tool: ToolType) => {
      canvas?.core.setActiveTool(tool)
    },
  }
}

export function useViewport() {
  const canvas = useCanvas()

  return {
    get viewport() {
      return canvas?.viewport() || { x: 0, y: 0, zoom: 1 }
    },
    setViewport: (viewport: ViewportState) => {
      canvas?.core.setViewport(viewport)
    },
    zoomIn: () => canvas?.core.zoomIn(),
    zoomOut: () => canvas?.core.zoomOut(),
    resetZoom: () => canvas?.core.resetZoom(),
    zoomToFit: () => canvas?.core.zoomToFit(),
  }
}

export function useHistory() {
  const canvas = useCanvas()

  return {
    undo: () => canvas?.core.undo() ?? false,
    redo: () => canvas?.core.redo() ?? false,
    canUndo: () => canvas?.core.canUndo() ?? false,
    canRedo: () => canvas?.core.canRedo() ?? false,
  }
}

export function useSelection() {
  const canvas = useCanvas()

  return {
    get selectedIds() {
      return canvas?.selectedIds() || new Set()
    },
    get elements() {
      return canvas?.elements() || new Map()
    },
    selectAll: () => canvas?.core.selectAll(),
    clearSelection: () => canvas?.core.clearSelection(),
    deleteSelected: () => canvas?.core.deleteSelected(),
  }
}

export function initCanvas(container: HTMLElement) {
  globalCanvas = createCanvas()
  const vanilla = new VanillaCanvas({ container })
  vanilla.render()
  return vanilla
}
