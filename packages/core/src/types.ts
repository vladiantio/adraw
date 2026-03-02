export type Point = { x: number; y: number }

export type Box = {
  x: number
  y: number
  width: number
  height: number
}

export type ElementType =
  | "rectangle"
  | "ellipse"
  | "star"
  | "polygon"
  | "draw"
  | "image"

export interface BaseElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  stroke: string
  strokeWidth: number
  fill: string
  opacity: number
}

export interface RectangleElement extends BaseElement {
  type: "rectangle"
  rx?: number
  ry?: number
}

export interface EllipseElement extends BaseElement {
  type: "ellipse"
}

export interface StarElement extends BaseElement {
  type: "star"
  points: number
  innerRadius: number
}

export interface PolygonElement extends BaseElement {
  type: "polygon"
  sides: number
}

export interface DrawElement extends BaseElement {
  type: "draw"
  points: Point[]
}

export interface ImageElement extends BaseElement {
  type: "image"
  url: string
}

export type AdrawElement =
  | RectangleElement
  | EllipseElement
  | StarElement
  | PolygonElement
  | DrawElement
  | ImageElement

export type Tool =
  | "select"
  | "hand"
  | "draw"
  | "erase"
  | "rectangle"
  | "ellipse"
  | "star"
  | "polygon"
  | "media"

export type HandleType = "nw" | "ne" | "sw" | "se" | "rotation"

export type AdrawState = {
  elements: AdrawElement[]
  selectedElementIds: string[]
  tool: Tool
  viewBox: Box
  zoom: number
  isPanning: boolean
  isResizing: boolean
  activeHandle: HandleType | null
  lastMousePos: Point
}

export type AdrawEvent =
  | { type: "POINTER_DOWN"; point: Point; event: PointerEvent }
  | { type: "POINTER_MOVE"; point: Point; event: PointerEvent }
  | { type: "POINTER_UP"; point: Point; event: PointerEvent }
  | {
      type: "WHEEL"
      deltaX: number
      deltaY: number
      point: Point
      ctrlKey: boolean
    }
  | { type: "SET_TOOL"; tool: Tool }
  | { type: "DELETE_SELECTED" }
  | { type: "UNDO" }
  | { type: "REDO" }
  | { type: "ADD_IMAGE"; url: string; point: Point }
