export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type ElementId = string

export type ElementType =
  | "rectangle"
  | "ellipse"
  | "star"
  | "path"
  | "media"
  | "group"

export interface BaseElement {
  id: ElementId
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  zIndex: number
  locked: boolean
  visible: boolean
}

export interface RectangleElement extends BaseElement {
  type: "rectangle"
  cornerRadius: number
}

export interface EllipseElement extends BaseElement {
  type: "ellipse"
}

export interface StarElement extends BaseElement {
  type: "star"
  points: number
  innerRadius: number
  outerRadius: number
}

export interface PathElement extends BaseElement {
  type: "path"
  points: Point[]
  strokeWidth: number
  strokeColor: string
  fillColor: string
}

export interface MediaElement extends BaseElement {
  type: "media"
  src: string
  mimeType: string
  naturalWidth: number
  naturalHeight: number
}

export interface GroupElement extends BaseElement {
  type: "group"
  children: ElementId[]
}

export type CanvasElement =
  | RectangleElement
  | EllipseElement
  | StarElement
  | PathElement
  | MediaElement
  | GroupElement

export type ToolType =
  | "select"
  | "hand"
  | "draw"
  | "eraser"
  | "rectangle"
  | "ellipse"
  | "star"
  | "media"

export interface ViewportState {
  x: number
  y: number
  zoom: number
}

export interface CanvasConfig {
  snapEnabled: boolean
  snapThreshold: number
  gridEnabled: boolean
  gridSize: number
  minZoom: number
  maxZoom: number
}

export interface CanvasState {
  elements: Map<ElementId, CanvasElement>
  selectedIds: Set<ElementId>
  viewport: ViewportState
  activeTool: ToolType
}

export type CanvasElementStyle = {
  strokeColor?: string
  fillColor?: string
  strokeWidth?: number
  opacity?: number
}

export interface Transform {
  translate: Point
  scale: Point
  rotation: number
}

export interface SnapGuide {
  type: "horizontal" | "vertical"
  position: number
  elements: ElementId[]
}

export interface SnapResult {
  guides: SnapGuide[]
  snapped: boolean
}
