"use client"

import type {
  CanvasElement,
  CanvasEventMap,
  CanvasOptions,
  Canvas as CoreCanvas,
  ElementId,
  ToolType,
  ViewportState,
} from "@adraw/core"
import { VanillaCanvas } from "@adraw/vanilla"
import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

export interface CanvasReactOptions extends CanvasOptions {}

interface CanvasContextValue {
  canvas: CoreCanvas | null
  vanillaCanvas: VanillaCanvas | null
  elements: Map<ElementId, CanvasElement>
  viewport: ViewportState
  activeTool: ToolType
  selectedIds: Set<ElementId>
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

interface CanvasProviderProps {
  children: ReactNode
  options?: CanvasReactOptions
}

export function CanvasProvider({ children, options }: CanvasProviderProps) {
  const vanillaRef = useRef<VanillaCanvas | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [elements, setElements] = useState<Map<ElementId, CanvasElement>>(
    new Map(),
  )
  const [viewport, setViewport] = useState<ViewportState>({
    x: 0,
    y: 0,
    zoom: 1,
  })
  const [activeTool, setActiveTool] = useState<ToolType>("select")
  const [selectedIds, setSelectedIds] = useState<Set<ElementId>>(new Set())

  useEffect(() => {
    if (!containerRef.current) return

    const vanilla = new VanillaCanvas({
      container: containerRef.current,
      initialViewport: options?.initialViewport,
      snapping: options?.snapping,
    })

    vanillaRef.current = vanilla

    const core = vanilla.getCore()

    core.on<"change">(
      "change",
      ({ elements: newElements }: CanvasEventMap["change"]) => {
        setElements(new Map(newElements))
      },
    )

    core.on<"viewportChange">(
      "viewportChange",
      ({ viewport: newViewport }: CanvasEventMap["viewportChange"]) => {
        setViewport(newViewport)
      },
    )

    core.on<"toolChange">(
      "toolChange",
      ({ tool }: CanvasEventMap["toolChange"]) => {
        setActiveTool(tool)
      },
    )

    core.on<"selectionChange">(
      "selectionChange",
      ({ selectedIds: newSelectedIds }: CanvasEventMap["selectionChange"]) => {
        setSelectedIds(new Set(newSelectedIds))
      },
    )

    vanilla.render()

    return () => {
      vanilla.destroy()
      vanillaRef.current = null
    }
  }, [options?.initialViewport, options?.snapping])

  const value = useMemo<CanvasContextValue>(
    () => ({
      canvas: vanillaRef.current?.getCore() ?? null,
      vanillaCanvas: vanillaRef.current,
      elements,
      viewport,
      activeTool,
      selectedIds,
    }),
    [elements, viewport, activeTool, selectedIds],
  )

  return (
    <CanvasContext.Provider value={value}>{children}</CanvasContext.Provider>
  )
}

export function useCanvas() {
  const context = useContext(CanvasContext)
  if (!context) {
    throw new Error("useCanvas must be used within a CanvasProvider")
  }
  return context
}

export function useTool() {
  const { canvas, activeTool } = useCanvas()

  const setTool = useCallback(
    (tool: ToolType) => {
      canvas?.setActiveTool(tool)
    },
    [canvas],
  )

  return { tool: activeTool, setTool }
}

export function useViewport() {
  const { canvas, viewport } = useCanvas()

  const setViewport = useCallback(
    (newViewport: ViewportState) => {
      canvas?.setViewport(newViewport)
    },
    [canvas],
  )

  const zoomIn = useCallback(() => {
    canvas?.zoomIn()
  }, [canvas])

  const zoomOut = useCallback(() => {
    canvas?.zoomOut()
  }, [canvas])

  const resetZoom = useCallback(() => {
    canvas?.resetZoom()
  }, [canvas])

  const zoomToFit = useCallback(() => {
    canvas?.zoomToFit()
  }, [canvas])

  return {
    viewport,
    setViewport,
    zoomIn,
    zoomOut,
    resetZoom,
    zoomToFit,
  }
}

export function useHistory() {
  const { canvas } = useCanvas()

  const undo = useCallback(() => {
    return canvas?.undo() ?? false
  }, [canvas])

  const redo = useCallback(() => {
    return canvas?.redo() ?? false
  }, [canvas])

  const canUndo = useCallback(() => {
    return canvas?.canUndo() ?? false
  }, [canvas])

  const canRedo = useCallback(() => {
    return canvas?.canRedo() ?? false
  }, [canvas])

  return { undo, redo, canUndo, canRedo }
}

export function useSelection() {
  const { canvas, selectedIds, elements } = useCanvas()

  const selectAll = useCallback(() => {
    canvas?.selectAll()
  }, [canvas])

  const clearSelection = useCallback(() => {
    canvas?.clearSelection()
  }, [canvas])

  const deleteSelected = useCallback(() => {
    canvas?.deleteSelected()
  }, [canvas])

  return {
    selectedIds,
    elements,
    selectAll,
    clearSelection,
    deleteSelected,
  }
}

interface CanvasProps {
  className?: string
  style?: React.CSSProperties
}

export function Canvas({ className, style }: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { vanillaCanvas } = useCanvas()

  useEffect(() => {
    if (!vanillaCanvas || !containerRef.current) return
    vanillaCanvas.render()
  }, [vanillaCanvas])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  )
}
