import {
  type CanvasElement,
  type CanvasOptions,
  Canvas as CoreCanvas,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import { VanillaCanvas } from "@adraw/vanilla"
import {
  createApp,
  h,
  onMounted,
  onUnmounted,
  type Ref,
  reactive,
  ref,
  type VNode,
} from "vue"

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
  const vanilla = ref<VanillaCanvas | null>(null)

  const state = reactive<CanvasState>({
    elements: core.getElements(),
    viewport: core.getViewport(),
    activeTool: core.getActiveTool(),
    selectedIds: core.getSelectedIds(),
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
    get tool() {
      return state.activeTool
    },
    setTool: (tool: ToolType) => {
      core?.setActiveTool(tool)
    },
  }
}

export function useViewport() {
  const { core, state } = useCanvas()

  return {
    get viewport() {
      return state.viewport
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
  const { core } = useCanvas()

  return {
    undo: () => core?.undo() ?? false,
    redo: () => core?.redo() ?? false,
    canUndo: () => core?.canUndo() ?? false,
    canRedo: () => core?.canRedo() ?? false,
  }
}

export function useSelection() {
  const { core, state } = useCanvas()

  return {
    get selectedIds() {
      return state.selectedIds
    },
    get elements() {
      return state.elements
    },
    selectAll: () => core?.selectAll(),
    clearSelection: () => core?.clearSelection(),
    deleteSelected: () => core?.deleteSelected(),
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
      if (!containerRef.value) return

      const vanilla = new VanillaCanvas({
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
        ref: containerRef,
        class: props.class,
        style: { width: "100%", height: "100%", ...props.style },
      })
  },
}
