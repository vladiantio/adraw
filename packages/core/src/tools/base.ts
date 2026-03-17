import type {
  CanvasElement,
  ElementId,
  Point,
  ToolType,
  ViewportState,
} from "../types"

export interface ToolContext {
  getElements: () => Map<ElementId, CanvasElement>
  setElements: (elements: Map<ElementId, CanvasElement>) => void
  getSelectedIds: () => Set<ElementId>
  setSelectedIds: (ids: Set<ElementId>) => void
  getViewport: () => ViewportState
  setViewport: (viewport: ViewportState) => void
  getCanvasSize: () => { width: number; height: number }
  pushHistory: () => void
  setActiveTool: (tool: ToolType) => void
}

export interface ToolState {
  isActive: boolean
  startPoint: Point | null
  currentPoint: Point | null
}

export interface Tool {
  readonly type: ToolType
  readonly cursor: string
  onActivate: (context: ToolContext) => void
  onDeactivate: (context: ToolContext) => void
  onPointerDown: (
    context: ToolContext,
    point: Point,
    event: PointerEvent,
  ) => void
  onPointerMove: (
    context: ToolContext,
    point: Point,
    event: PointerEvent,
  ) => void
  onPointerUp: (context: ToolContext, point: Point, event: PointerEvent) => void
  getTemporaryElement: () => CanvasElement | null
}

export function createBaseToolState(): ToolState {
  return {
    isActive: false,
    startPoint: null,
    currentPoint: null,
  }
}

export interface ToolOptions {
  strokeColor?: string
  fillColor?: string
  strokeWidth?: number
}

export function getDefaultToolOptions(): ToolOptions {
  return {
    strokeColor: "#000000",
    fillColor: "transparent",
    strokeWidth: 2,
  }
}

export function calculateBounds(
  startPoint: Point,
  endPoint: Point,
): { x: number; y: number; width: number; height: number } {
  const x = Math.min(startPoint.x, endPoint.x)
  const y = Math.min(startPoint.y, endPoint.y)
  const width = Math.abs(endPoint.x - startPoint.x)
  const height = Math.abs(endPoint.y - startPoint.y)

  return { x, y, width, height }
}

export function getCenterPoint(startPoint: Point, endPoint: Point): Point {
  return {
    x: (startPoint.x + endPoint.x) / 2,
    y: (startPoint.y + endPoint.y) / 2,
  }
}
