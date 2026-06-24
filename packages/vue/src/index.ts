import {
  AdrawCanvas,
  Canvas as CoreCanvas,
  type CanvasElement,
  type CanvasOptions,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import { h, onMounted, onUnmounted, reactive, ref, type VNode } from "vue"

export interface CanvasVueOptions extends CanvasOptions {
  initialViewport?: ViewportState
}

export interface CanvasState {
  elements: Map<ElementId, CanvasElement>
  viewport: ViewportState
  activeTool: ToolType
  selectedIds: Set<ElementId>
}

export function createCanvas(options?: CanvasVueOptions) {
  const core = new CoreCanvas(options)
  const vanilla = ref<AdrawCanvas | null>(null)

  const state = reactive<CanvasState>({
    activeTool: core.getActiveTool(),
    elements: core.getElements(),
    selectedIds: core.getSelectedIds(),
    viewport: core.getViewport(),
  })

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

  return {
    core,
    state,
    vanilla,
  }
}

export function useCanvas() {
  return (window as any).__adrawVueCanvas
}

export function useTool() {
  const { core, state } = useCanvas()

  return {
    setTool: (tool: ToolType) => {
      core?.setActiveTool(tool)
    },
    get tool() {
      return state.activeTool
    },
  }
}

export function useViewport() {
  const { core, state } = useCanvas()

  return {
    resetZoom: () => core?.resetZoom(),
    setViewport: (viewport: ViewportState) => {
      core?.setViewport(viewport)
    },
    get viewport() {
      return state.viewport
    },
    zoomIn: () => core?.zoomIn(),
    zoomOut: () => core?.zoomOut(),
    zoomToFit: () => core?.zoomToFit(),
  }
}

export function useHistory() {
  const { core } = useCanvas()

  return {
    canRedo: () => core?.canRedo() ?? false,
    canUndo: () => core?.canUndo() ?? false,
    redo: () => core?.redo() ?? false,
    undo: () => core?.undo() ?? false,
  }
}

export function useSelection() {
  const { core, state } = useCanvas()

  return {
    clearSelection: () => core?.clearSelection(),
    deleteSelected: () => core?.deleteSelected(),
    get elements() {
      return state.elements
    },
    selectAll: () => core?.selectAll(),
    get selectedIds() {
      return state.selectedIds
    },
  }
}

export const Canvas = {
  props: {
    class: String,
    style: Object,
  },
  setup(props: { class?: string; style?: Record<string, any> }): () => VNode {
    const containerRef = ref<HTMLDivElement | null>(null)
    const canvas = createCanvas()

    ;(window as any).__adrawVueCanvas = canvas

    onMounted(() => {
      if (!containerRef.value) {
        return
      }

      const vanilla = new AdrawCanvas({
        container: containerRef.value,
      })

      canvas.vanilla.value = vanilla
      vanilla.render()
    })

    onUnmounted(() => {
      canvas.vanilla.value?.destroy()
    })

    return () =>
      h("div", {
        class: props.class,
        ref: containerRef,
        style: { height: "100%", width: "100%", ...props.style },
      })
  },
}
