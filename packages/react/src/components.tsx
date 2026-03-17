"use client"

import type {
  CanvasElement,
  CanvasEventMap,
  CanvasOptions,
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
  vanillaRef: React.RefObject<VanillaCanvas | null>
  elements: Map<ElementId, CanvasElement>
  setElements: React.Dispatch<React.SetStateAction<Map<string, CanvasElement>>>
  viewport: ViewportState
  setViewport: React.Dispatch<React.SetStateAction<ViewportState>>
  activeTool: ToolType
  setActiveTool: React.Dispatch<React.SetStateAction<ToolType>>
  selectedIds: Set<ElementId>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  options?: CanvasReactOptions
  setOptions: React.Dispatch<
    React.SetStateAction<CanvasReactOptions | undefined>
  >
}

const CanvasContext = createContext<CanvasContextValue | null>(null)

interface CanvasProviderProps {
  children: ReactNode
  options?: CanvasReactOptions
}

export function CanvasProvider({
  children,
  options: defaultOptions,
}: CanvasProviderProps) {
  const [options, setOptions] = useState<CanvasReactOptions | undefined>(
    defaultOptions,
  )
  const vanillaRef = useRef<VanillaCanvas | null>(null)
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

  const value = useMemo<CanvasContextValue>(
    () => ({
      vanillaRef,
      elements,
      setElements,
      viewport,
      setViewport,
      activeTool,
      setActiveTool,
      selectedIds,
      setSelectedIds,
      options,
      setOptions,
    }),
    [elements, viewport, activeTool, selectedIds, options],
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
  const { vanillaRef, activeTool, setActiveTool } = useCanvas()

  const setTool = useCallback(
    (tool: ToolType) => {
      vanillaRef?.current?.getCore().setActiveTool(tool)
      setActiveTool(tool)
    },
    [vanillaRef, setActiveTool],
  )

  return { tool: activeTool, setTool }
}

export function useViewport() {
  const { vanillaRef, viewport } = useCanvas()

  const setViewport = useCallback(
    (newViewport: ViewportState) => {
      vanillaRef?.current?.getCore().setViewport(newViewport)
    },
    [vanillaRef],
  )

  const zoomIn = useCallback(() => {
    vanillaRef?.current?.getCore().zoomIn()
  }, [vanillaRef])

  const zoomOut = useCallback(() => {
    vanillaRef?.current?.getCore().zoomOut()
  }, [vanillaRef])

  const resetZoom = useCallback(() => {
    vanillaRef?.current?.getCore().resetZoom()
  }, [vanillaRef])

  const zoomToFit = useCallback(() => {
    vanillaRef?.current?.getCore().zoomToFit()
  }, [vanillaRef])

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
  const { vanillaRef } = useCanvas()

  const undo = useCallback(() => {
    return vanillaRef?.current?.getCore().undo() ?? false
  }, [vanillaRef])

  const redo = useCallback(() => {
    return vanillaRef?.current?.getCore().redo() ?? false
  }, [vanillaRef])

  const canUndo = useCallback(() => {
    return vanillaRef?.current?.getCore().canUndo() ?? false
  }, [vanillaRef])

  const canRedo = useCallback(() => {
    return vanillaRef?.current?.getCore().canRedo() ?? false
  }, [vanillaRef])

  return { undo, redo, canUndo, canRedo }
}

export function useSelection() {
  const { vanillaRef, selectedIds, elements } = useCanvas()

  const selectAll = useCallback(() => {
    vanillaRef?.current?.getCore().selectAll()
  }, [vanillaRef])

  const clearSelection = useCallback(() => {
    vanillaRef?.current?.getCore().clearSelection()
  }, [vanillaRef])

  const deleteSelected = useCallback(() => {
    vanillaRef?.current?.getCore().deleteSelected()
  }, [vanillaRef])

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
  const {
    vanillaRef,
    options,
    setElements,
    setViewport,
    setActiveTool,
    setSelectedIds,
  } = useCanvas()

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
  }, [
    options?.initialViewport,
    options?.snapping,
    setActiveTool,
    setElements,
    setSelectedIds,
    setViewport,
    vanillaRef,
  ])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
    />
  )
}
