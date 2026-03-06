import {
  type CanvasElement,
  type CanvasOptions,
  Canvas as CoreCanvas,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import { VanillaCanvas } from "@adraw/vanilla"
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
    elements: core.getElements(),
    viewport: core.getViewport(),
    activeTool: core.getActiveTool(),
    selectedIds: core.getSelectedIds(),
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
    get tool() {
      return state?.activeTool || "select"
    },
    setTool: (tool: ToolType) => {
      core?.setActiveTool(tool)
    },
  }
}

export function useViewport() {
  const { core, state } = useCanvas() || {}

  return {
    get viewport() {
      return state?.viewport || { x: 0, y: 0, zoom: 1 }
    },
    setViewport: (viewport: ViewportState) => {
      core?.setViewport(viewport)
    },
    zoomIn: () => core?.zoomIn(),
    zoomOut: () => core?.zoomOut(),
    resetZoom: () => core?.resetZoom(),
    zoomToFit: () => core?.zoomToFit(),
  }
}

export function useHistory() {
  const { core } = useCanvas() || {}

  return {
    undo: () => core?.undo() ?? false,
    redo: () => core?.redo() ?? false,
    canUndo: () => core?.canUndo() ?? false,
    canRedo: () => core?.canRedo() ?? false,
  }
}

export function useSelection() {
  const { core, state } = useCanvas() || {}

  return {
    get selectedIds() {
      return state?.selectedIds || new Set()
    },
    get elements() {
      return state?.elements || new Map()
    },
    selectAll: () => core?.selectAll(),
    clearSelection: () => core?.clearSelection(),
    deleteSelected: () => core?.deleteSelected(),
  }
}

export interface CanvasProps {
  class?: string
  style?: string
}

export function Canvas(props: CanvasProps) {
  let container: HTMLDivElement | undefined = undefined
  let vanilla: VanillaCanvas | undefined = undefined
  let canvasData: ReturnType<typeof createCanvas> | undefined = undefined

  onMount(() => {
    canvasData = createCanvas()
    ;(window as any).__adrawSvelteCanvas = canvasData

    vanilla = new VanillaCanvas({
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
