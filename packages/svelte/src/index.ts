import {
  AdrawCanvas,
  Canvas as CoreCanvas,
  type CanvasElement,
  type CanvasOptions,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import { onDestroy, onMount } from "svelte"

export interface CanvasSvelteOptions extends CanvasOptions {
  initialViewport?: ViewportState
}

export interface CanvasState {
  elements: Map<ElementId, CanvasElement>
  viewport: ViewportState
  activeTool: ToolType
  selectedIds: Set<ElementId>
}

export function createCanvas(options?: CanvasSvelteOptions) {
  const core = new CoreCanvas(options)

  const state: CanvasState = {
    activeTool: core.getActiveTool(),
    elements: core.getElements(),
    selectedIds: core.getSelectedIds(),
    viewport: core.getViewport(),
  }

  core.on("change", ({ elements: newElements }) => {
    state.elements = new Map(newElements)
  })

  core.on("viewportChange", ({ viewport: newViewport }) => {
    state.viewport = newViewport
  })

  core.on("toolChange", ({ tool }) => {
    state.activeTool = tool
  })

  core.on("selectionChange", ({ selectedIds: newSelectedIds }) => {
    state.selectedIds = new Set(newSelectedIds)
  })

  return { core, state }
}

export function useCanvas() {
  return (window as any).__adrawSvelteCanvas
}

export function useTool() {
  const { core, state } = useCanvas() || {}

  return {
    setTool: (tool: ToolType) => {
      core?.setActiveTool(tool)
    },
    get tool() {
      return state?.activeTool || "select"
    },
  }
}

export function useViewport() {
  const { core, state } = useCanvas() || {}

  return {
    resetZoom: () => core?.resetZoom(),
    setViewport: (viewport: ViewportState) => {
      core?.setViewport(viewport)
    },
    get viewport() {
      return state?.viewport || { x: 0, y: 0, zoom: 1 }
    },
    zoomIn: () => core?.zoomIn(),
    zoomOut: () => core?.zoomOut(),
    zoomToFit: () => core?.zoomToFit(),
  }
}

export function useHistory() {
  const { core } = useCanvas() || {}

  return {
    canRedo: () => core?.canRedo() ?? false,
    canUndo: () => core?.canUndo() ?? false,
    redo: () => core?.redo() ?? false,
    undo: () => core?.undo() ?? false,
  }
}

export function useSelection() {
  const { core, state } = useCanvas() || {}

  return {
    clearSelection: () => core?.clearSelection(),
    deleteSelected: () => core?.deleteSelected(),
    get elements() {
      return state?.elements || new Map()
    },
    selectAll: () => core?.selectAll(),
    get selectedIds() {
      return state?.selectedIds || new Set()
    },
  }
}

export interface CanvasProps {
  class?: string
  style?: string
}

export function Canvas(props: CanvasProps) {
  let container: HTMLDivElement | undefined = undefined
  let vanilla: AdrawCanvas | undefined
  let canvasData: ReturnType<typeof createCanvas> | undefined

  onMount(() => {
    canvasData = createCanvas()
    ;(window as any).__adrawSvelteCanvas = canvasData

    vanilla = new AdrawCanvas({
      container: container!,
    })
    vanilla.render()
  })

  onDestroy(() => {
    vanilla?.destroy()
  })

  return {
    render() {
      return `<div bind:this={container} class="${props.class || ""}" style="width: 100%; height: 100%; ${props.style || ""}"></div>`
    },
  }
}
