import {
  AdrawCanvas,
  type CanvasElement,
  type CanvasEventMap,
  type CanvasOptions,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import {
  createComponent,
  createContext,
  createSignal,
  onCleanup,
  onMount,
  useContext,
  type Accessor,
  type JSX,
  type Setter,
} from "solid-js"

export interface CanvasSolidOptions extends CanvasOptions {}

interface CanvasRef {
  current: AdrawCanvas | null
}

interface CanvasContextValue {
  canvasRef: CanvasRef
  elements: Accessor<Map<ElementId, CanvasElement>>
  setElements: Setter<Map<ElementId, CanvasElement>>
  viewport: Accessor<ViewportState>
  setViewport: Setter<ViewportState>
  activeTool: Accessor<ToolType>
  setActiveTool: Setter<ToolType>
  selectedIds: Accessor<Set<ElementId>>
  setSelectedIds: Setter<Set<ElementId>>
  canUndo: Accessor<boolean>
  setCanUndo: Setter<boolean>
  canRedo: Accessor<boolean>
  setCanRedo: Setter<boolean>
  options?: CanvasSolidOptions
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

export interface CanvasProviderProps {
  children?: JSX.Element
  options?: CanvasSolidOptions
}

export function CanvasProvider(props: CanvasProviderProps): JSX.Element {
  const canvasRef: CanvasRef = { current: null }
  const [elements, setElements] = createSignal<Map<ElementId, CanvasElement>>(
    new Map(),
  )
  const [viewport, setViewport] = createSignal<ViewportState>({
    x: 0,
    y: 0,
    zoom: 1,
  })
  const [activeTool, setActiveTool] = createSignal<ToolType>("select")
  const [selectedIds, setSelectedIds] = createSignal<Set<ElementId>>(new Set())
  const [canUndo, setCanUndo] = createSignal(false)
  const [canRedo, setCanRedo] = createSignal(false)

  const value: CanvasContextValue = {
    activeTool,
    canRedo,
    canUndo,
    canvasRef,
    elements,
    get options() {
      return props.options
    },
    selectedIds,
    setActiveTool,
    setCanRedo,
    setCanUndo,
    setElements,
    setSelectedIds,
    setViewport,
    viewport,
  }

  return createComponent(CanvasContext.Provider, {
    get children() {
      return props.children
    },
    value,
  })
}

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider")
  }
  return context
}

export function useTool() {
  const { canvasRef, activeTool } = useCanvas()

  return {
    setTool: (tool: ToolType) => {
      canvasRef.current?.setActiveTool(tool)
    },
    get tool() {
      return activeTool()
    },
  }
}

export function useViewport() {
  const { canvasRef, viewport } = useCanvas()

  return {
    resetZoom: () => canvasRef.current?.resetZoom(),
    setViewport: (newViewport: ViewportState) => {
      canvasRef.current?.setViewport(newViewport)
    },
    get viewport() {
      return viewport()
    },
    zoomIn: () => canvasRef.current?.zoomIn(),
    zoomOut: () => canvasRef.current?.zoomOut(),
    zoomToFit: () => canvasRef.current?.zoomToFit(),
  }
}

export function useHistory() {
  const { canvasRef, canUndo, canRedo } = useCanvas()

  return {
    canRedo: () => canRedo(),
    canUndo: () => canUndo(),
    redo: () => canvasRef.current?.redo() ?? false,
    undo: () => canvasRef.current?.undo() ?? false,
  }
}

export function useSelection() {
  const { canvasRef, selectedIds, elements } = useCanvas()

  return {
    clearSelection: () => canvasRef.current?.clearSelection(),
    deleteSelected: () => canvasRef.current?.deleteSelected(),
    get elements() {
      return elements()
    },
    selectAll: () => canvasRef.current?.selectAll(),
    get selectedIds() {
      return selectedIds()
    },
  }
}

export interface CanvasProps {
  class?: string
  style?: JSX.CSSProperties
}

export function Canvas(props: CanvasProps): JSX.Element {
  const {
    canvasRef,
    options,
    setElements,
    setViewport,
    setActiveTool,
    setSelectedIds,
    setCanUndo,
    setCanRedo,
  } = useCanvas()
  let containerRef: HTMLDivElement | undefined

  onMount(() => {
    if (!containerRef) {
      return
    }

    const canvas = new AdrawCanvas({
      container: containerRef,
      initialViewport: options?.initialViewport,
      snapping: options?.snapping,
    })

    canvasRef.current = canvas

    // Read history availability after the current pointer/tool handler
    // finishes: tools emit "change" from setElements before calling
    // pushHistory, so canUndo/canRedo are only accurate on the next microtask.
    const syncHistory = () => {
      queueMicrotask(() => {
        setCanUndo(canvas.canUndo())
        setCanRedo(canvas.canRedo())
      })
    }

    canvas.on<"change">(
      "change",
      ({ elements: newElements }: CanvasEventMap["change"]) => {
        setElements(new Map(newElements))
        syncHistory()
      },
    )

    canvas.on<"viewportChange">(
      "viewportChange",
      ({ viewport: newViewport }: CanvasEventMap["viewportChange"]) => {
        setViewport(newViewport)
      },
    )

    canvas.on<"toolChange">(
      "toolChange",
      ({ tool }: CanvasEventMap["toolChange"]) => {
        setActiveTool(tool)
      },
    )

    canvas.on<"selectionChange">(
      "selectionChange",
      ({ selectedIds: newSelectedIds }: CanvasEventMap["selectionChange"]) => {
        setSelectedIds(new Set(newSelectedIds))
      },
    )

    canvas.render()
  })

  onCleanup(() => {
    canvasRef.current?.destroy()
    canvasRef.current = null
  })

  return (
    <div
      ref={containerRef}
      class={props.class}
      style={{ height: "100%", width: "100%", ...props.style }}
    />
  )
}
