import { screenToCanvas } from "./coordinates"
import { DEFAULT_PATH_SMOOTHING, getElementsBounds } from "./elements"
import {
  canRedo,
  canUndo,
  createHistoryState,
  pushHistory,
  redo,
  undo,
} from "./history"
import { createSnappingConfig, type SnappingConfig } from "./snapping"
import {
  createDrawTool,
  createEllipseTool,
  createEraserTool,
  createHandTool,
  createMediaTool,
  createRectangleTool,
  createSelectTool,
} from "./tools"
import type { Tool, ToolContext } from "./tools/base"
import type {
  CanvasElement,
  ElementId,
  Point,
  ToolType,
  ViewportState,
} from "./types"
import {
  createViewport,
  panViewport,
  resetViewport,
  zoomViewport,
} from "./viewport"

export interface CanvasOptions {
  snapping?: Partial<SnappingConfig>
  initialViewport?: ViewportState
}

export interface AdrawCanvasOptions extends CanvasOptions {
  // When provided, the canvas mounts into this container immediately. Omit it to
  // create a headless instance (state only) and call `mount(container)` later.
  container?: HTMLElement
}

export interface CanvasEventMap {
  change: { elements: Map<ElementId, CanvasElement> }
  viewportChange: { viewport: ViewportState }
  toolChange: { tool: ToolType }
  selectionChange: { selectedIds: Set<ElementId> }
}

type EventListener<K extends keyof CanvasEventMap> = (
  event: CanvasEventMap[K],
) => void

const svgNamespaceURI = "http://www.w3.org/2000/svg"
const elementsGroupClass = "adraw-elements-group"
const elementClass = "adraw-element"
const temporaryGroupClass = "adraw-temporary-group"
const temporaryClass = "adraw-temporary"
const guidesGroupClass = "adraw-guides-group"
const selectedClass = "adraw-selected"
const transformOverlayClass = "adraw-transform-overlay"
const rotationHandleClass = "adraw-rotation-handle"
const resizeHandleClass = "adraw-resize-handle"

// Cursor for each resize/rotation handle, keyed by its `data-anchor` value.
const handleCursorMap: Record<string, string> = {
  "bottom-center": "s-resize",
  "bottom-left": "sw-resize",
  "bottom-right": "se-resize",
  "left-center": "w-resize",
  "right-center": "e-resize",
  rotation: "crosshair",
  "top-center": "n-resize",
  "top-left": "nw-resize",
  "top-right": "ne-resize",
}

function getTransformElementAttribute(element: CanvasElement) {
  // Paths are drawn from absolute points (no translate), so they must rotate
  // about their absolute bbox center. Other elements are translated to (x, y)
  // first, so their pivot is the local center (width/2, height/2).
  if (element.type === "path") {
    const cx = element.x + element.width / 2
    const cy = element.y + element.height / 2
    return `rotate(${element.rotation}, ${cx}, ${cy})`
  }
  const translate = `translate(${element.x}, ${element.y})`
  const rotate = `rotate(${element.rotation}, ${element.width / 2}, ${element.height / 2})`
  return `${translate} ${rotate}`
}

// Render the path through every point with a Cardinal/Catmull-Rom spline
// expressed as cubic Béziers. This yields a smooth curve that still
// interpolates each point, unlike straight line segments which look jagged for
// freehand strokes. `tension` scales the control-point tangents: 0 collapses to
// straight segments, 1 gives a full Catmull-Rom curve.
export function pointsToPath(
  points: Point[],
  tension = DEFAULT_PATH_SMOOTHING,
): string {
  if (points.length === 0) {
    return ""
  }

  let d = `M ${points[0].x} ${points[0].y}`

  if (points.length < 3 || tension <= 0) {
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }
    return d
  }

  // Catmull-Rom tangents are (p2 - p0) / 2 scaled to thirds for the Bézier
  // control points, i.e. /6. Folding tension in gives tension / 6.
  const k = tension / 6

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2 < points.length ? i + 2 : points.length - 1]

    const cp1x = p1.x + (p2.x - p0.x) * k
    const cp1y = p1.y + (p2.y - p0.y) * k
    const cp2x = p2.x - (p3.x - p1.x) * k
    const cp2y = p2.y - (p3.y - p1.y) * k

    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`
  }

  return d
}

export function createElementGroup(element: CanvasElement): SVGGElement {
  const group = document.createElementNS(svgNamespaceURI, "g")
  group.id = element.id
  group.setAttribute("transform", getTransformElementAttribute(element))

  switch (element.type) {
    case "rectangle": {
      const rect = document.createElementNS(svgNamespaceURI, "rect")
      rect.setAttribute("width", String(element.width))
      rect.setAttribute("height", String(element.height))
      rect.setAttribute("rx", String(element.cornerRadius))
      rect.setAttribute("fill", "var(--adraw-fill-color, transparent)")
      rect.setAttribute("stroke", "var(--adraw-stroke-color, #000)")
      rect.setAttribute("stroke-width", "2")
      group.appendChild(rect)
      break
    }

    case "ellipse": {
      const ellipse = document.createElementNS(svgNamespaceURI, "ellipse")
      ellipse.setAttribute("cx", String(element.width / 2))
      ellipse.setAttribute("cy", String(element.height / 2))
      ellipse.setAttribute("rx", String(element.width / 2))
      ellipse.setAttribute("ry", String(element.height / 2))
      ellipse.setAttribute("fill", "var(--adraw-fill-color, transparent)")
      ellipse.setAttribute("stroke", "var(--adraw-stroke-color, #000)")
      ellipse.setAttribute("stroke-width", "2")
      group.appendChild(ellipse)
      break
    }

    case "path": {
      const pathData = pointsToPath(element.points, element.smoothing)
      const path = document.createElementNS(svgNamespaceURI, "path")
      path.setAttribute("d", pathData)
      path.setAttribute("fill", element.fillColor || "none")
      path.setAttribute(
        "stroke",
        element.strokeColor || "var(--adraw-stroke-color, #000)",
      )
      path.setAttribute("stroke-width", String(element.strokeWidth || 2))
      group.appendChild(path)
      break
    }

    case "media": {
      const image = document.createElementNS(svgNamespaceURI, "image")
      image.setAttribute("href", element.src)
      image.setAttribute("width", String(element.width))
      image.setAttribute("height", String(element.height))
      image.setAttribute("preserveAspectRatio", "none")
      group.appendChild(image)
      break
    }
  }

  return group
}

export class AdrawCanvas {
  // ── Canvas state (pure logic, available headless) ──
  private elements = new Map<ElementId, CanvasElement>()
  private selectedIds = new Set<ElementId>()
  private viewport: ViewportState
  private activeTool: Tool
  private snappingConfig: SnappingConfig
  private history = createHistoryState()
  private listeners = new Map<keyof CanvasEventMap, Set<EventListener<any>>>()
  private canvasSize: { width: number; height: number } = {
    height: 0,
    width: 0,
  }
  private tools = new Map<ToolType, Tool>()

  // ── DOM adapter (populated by mount) ──
  private container: HTMLElement | null = null
  private svgElement: SVGSVGElement | null = null
  private elementsGroup: SVGGElement | null = null
  private temporaryGroup: SVGGElement | null = null
  private guidesGroup: SVGGElement | null = null
  private transformOverlay: SVGGElement | null = null
  private resizeObserver: ResizeObserver | null = null

  // Touch gesture state
  private pinchStartDistance: number | null = null
  private pinchStartCenter: { x: number; y: number } | null = null
  private pinchViewportState: ViewportState | null = null

  constructor(options: AdrawCanvasOptions = {}) {
    this.viewport = createViewport(options.initialViewport)
    this.snappingConfig = createSnappingConfig(options.snapping)

    this.tools.set("select", createSelectTool())
    this.tools.set("hand", createHandTool())
    this.tools.set("rectangle", createRectangleTool())
    this.tools.set("ellipse", createEllipseTool())
    this.tools.set("draw", createDrawTool())
    this.tools.set("eraser", createEraserTool())
    this.tools.set("media", createMediaTool())

    this.activeTool = this.tools.get("select")!
    this.activeTool.onActivate(this.getToolContext())

    if (options.container) {
      this.mount(options.container)
    }
  }

  private getToolContext(): ToolContext {
    return {
      getCanvasSize: () => this.canvasSize,
      getElements: () => this.elements,
      getSelectedIds: () => this.selectedIds,
      getViewport: () => this.viewport,
      pushHistory: () => {
        this.history = pushHistory(
          this.history,
          this.elements,
          this.selectedIds,
        )
      },
      setActiveTool: (tool) => this.setActiveTool(tool),
      setElements: (elements) => {
        this.elements = elements
        this.emit("change", { elements: this.elements })
      },
      setSelectedIds: (ids) => {
        this.selectedIds = ids
        this.emit("selectionChange", { selectedIds: this.selectedIds })
      },
      setViewport: (viewport) => {
        this.viewport = viewport
        this.emit("viewportChange", { viewport: this.viewport })
      },
    }
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasSize = { height, width }
  }

  setActiveTool(toolType: ToolType): void {
    const newTool = this.tools.get(toolType)
    if (!newTool || newTool === this.activeTool) {
      return
    }

    this.activeTool.onDeactivate(this.getToolContext())
    this.activeTool = newTool
    this.activeTool.onActivate(this.getToolContext())
    this.emit("toolChange", { tool: toolType })
  }

  getActiveTool(): ToolType {
    return this.activeTool.type
  }

  getViewport(): ViewportState {
    return this.viewport
  }

  setViewport(viewport: ViewportState): void {
    this.viewport = viewport
    this.emit("viewportChange", { viewport: this.viewport })
  }

  getElements(): Map<ElementId, CanvasElement> {
    return this.elements
  }

  getSelectedIds(): Set<ElementId> {
    return this.selectedIds
  }

  getSnappingConfig(): SnappingConfig {
    return this.snappingConfig
  }

  setSnappingConfig(config: Partial<SnappingConfig>): void {
    this.snappingConfig = { ...this.snappingConfig, ...config }
  }

  canUndo(): boolean {
    return canUndo(this.history)
  }

  canRedo(): boolean {
    return canRedo(this.history)
  }

  undo(): boolean {
    const result = undo(this.history, this.elements, this.selectedIds)
    if (result) {
      this.elements = result.elements
      this.selectedIds = result.selectedIds
      this.history = result.state
      this.emit("change", { elements: this.elements })
      this.emit("selectionChange", { selectedIds: this.selectedIds })
      return true
    }
    return false
  }

  redo(): boolean {
    const result = redo(this.history, this.elements, this.selectedIds)
    if (result) {
      this.elements = result.elements
      this.selectedIds = result.selectedIds
      this.history = result.state
      this.emit("change", { elements: this.elements })
      this.emit("selectionChange", { selectedIds: this.selectedIds })
      return true
    }
    return false
  }

  handlePointerDown(
    screenX: number,
    screenY: number,
    event: PointerEvent,
  ): void {
    const point = screenToCanvas(
      { x: screenX, y: screenY },
      this.viewport,
      this.canvasSize,
    )
    this.activeTool.onPointerDown(this.getToolContext(), point, event)
  }

  handlePointerMove(
    screenX: number,
    screenY: number,
    event: PointerEvent,
  ): void {
    const point = screenToCanvas(
      { x: screenX, y: screenY },
      this.viewport,
      this.canvasSize,
    )
    this.activeTool.onPointerMove(this.getToolContext(), point, event)
  }

  handlePointerUp(screenX: number, screenY: number, event: PointerEvent): void {
    const point = screenToCanvas(
      { x: screenX, y: screenY },
      this.viewport,
      this.canvasSize,
    )
    this.activeTool.onPointerUp(this.getToolContext(), point, event)
  }

  handleWheel(event: WheelEvent, screenX?: number, screenY?: number): void {
    event.preventDefault()

    if (event.ctrlKey || event.metaKey) {
      let x = screenX ?? event.clientX
      let y = screenY ?? event.clientY

      if (screenX === undefined || screenY === undefined) {
        const currentTarget = event.currentTarget as HTMLElement | null
        if (currentTarget) {
          const rect = currentTarget.getBoundingClientRect()
          x = event.clientX - rect.left
          y = event.clientY - rect.top
        }
      }

      const centerPoint = {
        x:
          (this.canvasSize.width / 2 - x) / this.viewport.zoom +
          this.viewport.x,
        y:
          (this.canvasSize.height / 2 - y) / this.viewport.zoom +
          this.viewport.y,
      }
      this.viewport = zoomViewport(this.viewport, event.deltaY, centerPoint)
    } else {
      this.viewport = panViewport(this.viewport, {
        x: event.deltaX / this.viewport.zoom,
        y: event.deltaY / this.viewport.zoom,
      })
    }

    this.emit("viewportChange", { viewport: this.viewport })
  }

  handleKeyDown(event: KeyboardEvent): void {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }

    const key = event.key.toLowerCase()

    if (event.ctrlKey || event.metaKey) {
      if (key === "z" && !event.shiftKey) {
        event.preventDefault()
        this.undo()
      } else if ((key === "z" && event.shiftKey) || key === "y") {
        event.preventDefault()
        this.redo()
      } else if (key === "a") {
        event.preventDefault()
        this.selectAll()
      }
    } else {
      switch (key) {
        case "v": {
          this.setActiveTool("select")
          break
        }
        case "h": {
          this.setActiveTool("hand")
          break
        }
        case "d": {
          this.setActiveTool("draw")
          break
        }
        case "e": {
          this.setActiveTool("eraser")
          break
        }
        case "r": {
          this.setActiveTool("rectangle")
          break
        }
        case "m": {
          this.setActiveTool("media")
          break
        }
        case "delete":
        case "backspace": {
          this.deleteSelected()
          break
        }
        case "escape": {
          this.clearSelection()
          break
        }
      }
    }
  }

  selectAll(): void {
    this.selectedIds = new Set(this.elements.keys())
    this.emit("selectionChange", { selectedIds: this.selectedIds })
  }

  clearSelection(): void {
    this.selectedIds = new Set()
    this.emit("selectionChange", { selectedIds: this.selectedIds })
  }

  deleteSelected(): void {
    if (this.selectedIds.size === 0) {
      return
    }

    for (const id of this.selectedIds) {
      this.elements.delete(id)
    }

    this.history = pushHistory(this.history, this.elements, this.selectedIds)
    this.selectedIds = new Set()
    this.emit("change", { elements: this.elements })
    this.emit("selectionChange", { selectedIds: this.selectedIds })
  }

  zoomIn(): void {
    const center = { x: 0, y: 0 }
    this.viewport = zoomViewport(this.viewport, -100, center)
    this.emit("viewportChange", { viewport: this.viewport })
  }

  zoomOut(): void {
    const center = { x: 0, y: 0 }
    this.viewport = zoomViewport(this.viewport, 100, center)
    this.emit("viewportChange", { viewport: this.viewport })
  }

  resetZoom(): void {
    this.viewport = resetViewport()
    this.emit("viewportChange", { viewport: this.viewport })
  }

  zoomToFit(): void {
    const bounds = getElementsBounds(this.elements)
    if (!bounds) {
      return
    }

    const contentWidth = bounds.right - bounds.left
    const contentHeight = bounds.bottom - bounds.top

    if (contentWidth === 0 || contentHeight === 0) {
      return
    }

    const availableWidth = this.canvasSize.width - 100
    const availableHeight = this.canvasSize.height - 100

    const scaleX = availableWidth / contentWidth
    const scaleY = availableHeight / contentHeight
    const newZoom = Math.min(scaleX, scaleY, 10)

    this.viewport = {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2,
      zoom: Math.max(0.1, newZoom),
    }

    this.emit("viewportChange", { viewport: this.viewport })
  }

  getTemporaryElement(): CanvasElement | null {
    return this.activeTool.getTemporaryElement()
  }

  on<K extends keyof CanvasEventMap>(
    event: K,
    listener: EventListener<K>,
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(listener)
  }

  off<K extends keyof CanvasEventMap>(
    event: K,
    listener: EventListener<K>,
  ): void {
    this.listeners.get(event)?.delete(listener)
  }

  private emit<K extends keyof CanvasEventMap>(
    event: K,
    data: CanvasEventMap[K],
  ): void {
    this.listeners.get(event)?.forEach((listener) => {
      listener(data)
    })
  }

  // ── DOM adapter ──

  // Attach the canvas to a DOM container, creating the SVG layers and wiring up
  // pointer/wheel/touch/keyboard events. Safe to call once; no-op if mounted.
  mount(container: HTMLElement): void {
    if (this.svgElement) {
      return
    }
    this.container = container
    this.init()
    this.setupEventListeners()
    this.render()
  }

  private init(): void {
    if (!this.container) {
      return
    }

    this.svgElement = document.createElementNS(svgNamespaceURI, "svg")
    this.svgElement.setAttribute("width", "100%")
    this.svgElement.setAttribute("height", "100%")
    this.svgElement.style.display = "block"
    this.svgElement.style.background = "var(--adraw-background, #ffffff)"
    this.svgElement.style.touchAction = "none"

    this.elementsGroup = document.createElementNS(svgNamespaceURI, "g")
    this.elementsGroup.classList.add(elementsGroupClass)

    this.temporaryGroup = document.createElementNS(svgNamespaceURI, "g")
    this.temporaryGroup.classList.add(temporaryGroupClass)

    this.guidesGroup = document.createElementNS(svgNamespaceURI, "g")
    this.guidesGroup.classList.add(guidesGroupClass)

    this.transformOverlay = document.createElementNS(svgNamespaceURI, "g")
    this.transformOverlay.classList.add(transformOverlayClass)

    this.svgElement.appendChild(this.elementsGroup)
    this.svgElement.appendChild(this.temporaryGroup)
    this.svgElement.appendChild(this.guidesGroup)
    this.svgElement.appendChild(this.transformOverlay)
    this.container.appendChild(this.svgElement)

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        this.setCanvasSize(width, height)
        this.render()
      }
    })
    this.resizeObserver.observe(this.container)
  }

  private getRelativePoint(event: MouseEvent | PointerEvent | WheelEvent): {
    x: number
    y: number
  } {
    if (!this.svgElement) {
      return { x: event.clientX, y: event.clientY }
    }
    const rect = this.svgElement.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  private setupEventListeners(): void {
    if (!this.svgElement) {
      return
    }

    this.svgElement.addEventListener("pointerdown", (event) => {
      const { x, y } = this.getRelativePoint(event)
      this.handlePointerDown(x, y, event)
      this.render()
    })

    this.svgElement.addEventListener("pointermove", (event) => {
      const { x, y } = this.getRelativePoint(event)
      this.handlePointerMove(x, y, event)
      this.render()
    })

    this.svgElement.addEventListener("pointerup", (event) => {
      const { x, y } = this.getRelativePoint(event)
      this.handlePointerUp(x, y, event)
      this.render()
    })

    // Set cursor based on hovered handle
    this.svgElement.addEventListener("pointermove", (event) => {
      if (!this.svgElement) {
        return
      }
      const target = event.target as HTMLElement
      const anchor = target.getAttribute("data-anchor")
      if (anchor && handleCursorMap[anchor]) {
        this.svgElement.style.cursor = handleCursorMap[anchor]
      } else if (!this.svgElement.style.cursor.startsWith("grab")) {
        this.svgElement.style.cursor = "default"
      }
    })

    this.svgElement.addEventListener(
      "wheel",
      (event) => {
        const { x, y } = this.getRelativePoint(event)
        this.handleWheel(event, x, y)
        this.render()
      },
      { passive: false },
    )

    this.svgElement.addEventListener(
      "touchstart",
      (event) => {
        if (event.touches.length === 2) {
          event.preventDefault()
          this.pinchStartDistance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY,
          )
          this.pinchStartCenter = {
            x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
            y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
          }
          this.pinchViewportState = { ...this.getViewport() }
        } else if (event.touches.length === 1) {
          const touch = event.touches[0] as unknown as PointerEvent
          const { x, y } = this.getRelativePoint(touch)
          this.handlePointerDown(x, y, touch)
          this.render()
        }
      },
      { passive: false },
    )

    this.svgElement.addEventListener(
      "touchmove",
      (event) => {
        if (
          event.touches.length === 2 &&
          this.pinchStartDistance !== null &&
          this.pinchStartCenter &&
          this.pinchViewportState
        ) {
          event.preventDefault()

          const currentDistance = Math.hypot(
            event.touches[0].clientX - event.touches[1].clientX,
            event.touches[0].clientY - event.touches[1].clientY,
          )
          const currentCenter = {
            x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
            y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
          }

          const scale = currentDistance / this.pinchStartDistance

          // Apply scaling relative to the start state and start center point
          const rect = this.svgElement?.getBoundingClientRect()
          if (!rect) {
            return
          }

          const canvasCenter = {
            x:
              (this.pinchStartCenter.x - rect.left - rect.width / 2) /
                this.pinchViewportState.zoom +
              this.pinchViewportState.x,
            y:
              (this.pinchStartCenter.y - rect.top - rect.height / 2) /
                this.pinchViewportState.zoom +
              this.pinchViewportState.y,
          }

          let newViewport = { ...this.pinchViewportState }

          // Set zoom directly from the pinch scale ratio (clamped), rather than
          // routing through zoomViewport which expects a wheel deltaY.
          newViewport.zoom = Math.max(
            0.1,
            Math.min(this.pinchViewportState.zoom * scale, 10),
          )

          // Adjust position so the center stays exactly where it was
          newViewport.x =
            canvasCenter.x -
            (canvasCenter.x - this.pinchViewportState.x) *
              (this.pinchViewportState.zoom / newViewport.zoom)
          newViewport.y =
            canvasCenter.y -
            (canvasCenter.y - this.pinchViewportState.y) *
              (this.pinchViewportState.zoom / newViewport.zoom)

          newViewport = panViewport(newViewport, {
            x: (this.pinchStartCenter.x - currentCenter.x) / newViewport.zoom,
            y: (this.pinchStartCenter.y - currentCenter.y) / newViewport.zoom,
          })

          this.setViewport(newViewport)
          this.render()
        } else if (event.touches.length === 1 && !this.pinchStartDistance) {
          const touch = event.touches[0] as unknown as PointerEvent
          const { x, y } = this.getRelativePoint(touch)
          this.handlePointerMove(x, y, touch)
          this.render()
        }
      },
      { passive: false },
    )

    this.svgElement.addEventListener("touchend", (event) => {
      this.handleTouchEnd(event)
    })

    this.svgElement.addEventListener("touchcancel", (event) => {
      this.handleTouchEnd(event)
    })

    document.addEventListener("keydown", (event) => {
      this.handleKeyDown(event)
      this.render()
    })

    this.on("change", () => {
      if (this.getActiveTool() === "select") {
        this.selectElements()
      } else {
        this.renderElements()
      }
    })

    this.on("viewportChange", () => {
      this.render()
    })

    this.on("toolChange", ({ tool }) => {
      this.updateCursor(tool)
    })

    this.on("selectionChange", () => {
      this.selectElements()
    })
  }

  private handleTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.pinchStartDistance = null
      this.pinchStartCenter = null
      this.pinchViewportState = null
    }

    if (event.touches.length === 0) {
      const touch = event.changedTouches[0] as unknown as PointerEvent
      const { x, y } = this.getRelativePoint(touch)
      this.handlePointerUp(x, y, touch)
      this.render()
    }
  }

  private updateCursor(tool: ToolType): void {
    const cursors: Record<ToolType, string> = {
      draw: "crosshair",
      ellipse: "crosshair",
      eraser: "crosshair",
      hand: "grab",
      media: "copy",
      rectangle: "crosshair",
      select: "default",
    }
    if (this.svgElement) {
      this.svgElement.style.cursor = cursors[tool] || "default"
    }
  }

  render(): void {
    if (!this.container) {
      return
    }

    const viewport = this.getViewport()
    const transform = `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`

    for (const group of [
      this.elementsGroup,
      this.temporaryGroup,
      this.transformOverlay,
    ]) {
      group?.setAttribute("transform", transform)
    }

    this.renderTemporary()
    this.renderTransformOverlay()
  }

  private renderTransformOverlay(): void {
    if (!this.transformOverlay) {
      return
    }

    this.transformOverlay.innerHTML = ""
    const selectedIds = this.getSelectedIds()
    const elements = this.getElements()

    if (selectedIds.size === 0) {
      return
    }

    const bounds = getElementsBounds(elements, selectedIds)
    if (!bounds) {
      return
    }

    const { x, y, width, height } = bounds

    const overlay = document.createElementNS(svgNamespaceURI, "g")
    if (selectedIds.size === 1) {
      const [onlyId] = selectedIds
      const element = elements.get(onlyId)
      if (element && element.rotation) {
        overlay.setAttribute(
          "transform",
          `rotate(${element.rotation}, ${x + width / 2}, ${y + height / 2})`,
        )
      }
    }
    this.transformOverlay.appendChild(overlay)

    // Main bounding box
    const rect = document.createElementNS(svgNamespaceURI, "rect")
    rect.setAttribute("x", String(x))
    rect.setAttribute("y", String(y))
    rect.setAttribute("width", String(width))
    rect.setAttribute("height", String(height))
    rect.setAttribute("fill", "none")
    rect.setAttribute("stroke", "var(--adraw-selection-color, #4f46e5)")
    rect.setAttribute("stroke-width", "2")
    rect.setAttribute("stroke-dasharray", "5,5")
    overlay.appendChild(rect)

    // Handle positions
    const handles = [
      { anchor: "top-left", x, y },
      { anchor: "top-center", x: x + width / 2, y },
      { anchor: "top-right", x: x + width, y },
      { anchor: "right-center", x: x + width, y: y + height / 2 },
      { anchor: "bottom-right", x: x + width, y: y + height },
      { anchor: "bottom-center", x: x + width / 2, y: y + height },
      { anchor: "bottom-left", x, y: y + height },
      { anchor: "left-center", x, y: y + height / 2 },
    ]

    // Rotation handle
    const rotationHandleY = y - 30
    const rotationHandle = document.createElementNS(svgNamespaceURI, "circle")
    rotationHandle.classList.add(rotationHandleClass)
    rotationHandle.setAttribute("cx", String(x + width / 2))
    rotationHandle.setAttribute("cy", String(rotationHandleY))
    rotationHandle.setAttribute("r", "6")
    rotationHandle.setAttribute("fill", "var(--adraw-selection-color, #4f46e5)")
    rotationHandle.setAttribute("stroke", "#ffffff")
    rotationHandle.setAttribute("stroke-width", "2")
    rotationHandle.setAttribute("data-anchor", "rotation")
    overlay.appendChild(rotationHandle)

    // Connecting line for rotation handle
    const rotationLine = document.createElementNS(svgNamespaceURI, "line")
    rotationLine.setAttribute("x1", String(x + width / 2))
    rotationLine.setAttribute("y1", String(y))
    rotationLine.setAttribute("x2", String(x + width / 2))
    rotationLine.setAttribute("y2", String(rotationHandleY + 6))
    rotationLine.setAttribute("stroke", "var(--adraw-selection-color, #4f46e5)")
    rotationLine.setAttribute("stroke-width", "2")
    overlay.appendChild(rotationLine)

    // Resize handles
    for (const handle of handles) {
      const square = document.createElementNS(svgNamespaceURI, "rect")
      const size = 8
      square.classList.add(resizeHandleClass)
      square.setAttribute("x", String(handle.x - size / 2))
      square.setAttribute("y", String(handle.y - size / 2))
      square.setAttribute("width", String(size))
      square.setAttribute("height", String(size))
      square.setAttribute("fill", "var(--adraw-selection-color, #4f46e5)")
      square.setAttribute("stroke", "#ffffff")
      square.setAttribute("stroke-width", "2")
      square.setAttribute("data-anchor", handle.anchor)
      overlay.appendChild(square)
    }
  }

  private renderElements(): void {
    if (!this.elementsGroup) {
      return
    }

    this.elementsGroup.innerHTML = ""
    const elements = this.getElements()
    const selectedIds = this.getSelectedIds()

    for (const [, element] of elements) {
      if (!element.visible) {
        continue
      }

      const group = createElementGroup(element)
      const isSelected = selectedIds.has(element.id)
      group.classList.add(elementClass)
      group.classList.toggle(selectedClass, isSelected)

      this.elementsGroup.appendChild(group)
    }
  }

  private renderTemporary(): void {
    if (!this.temporaryGroup) {
      return
    }

    this.temporaryGroup.innerHTML = ""
    const tempElement = this.getTemporaryElement()

    if (tempElement) {
      const group = createElementGroup(tempElement)
      group.classList.add(temporaryClass)
      this.temporaryGroup.appendChild(group)
    }
  }

  private selectElements(): void {
    if (!this.elementsGroup) {
      return
    }

    const elements = this.getElements()
    const selectedIds = this.getSelectedIds()

    for (const [, element] of elements) {
      if (!element.visible) {
        continue
      }

      const group = document.getElementById(element.id) as HTMLElement
      const isSelected = selectedIds.has(element.id)
      group.classList.toggle(selectedClass, isSelected)

      if (!isSelected) {
        continue
      }
      group.setAttribute("transform", getTransformElementAttribute(element))

      switch (element.type) {
        case "path": {
          // The select tool already transforms the points in canvas space, so
          // just re-render the path data from the current element state.
          const pathElement = group.getElementsByTagName("path")[0]
          pathElement.setAttribute(
            "d",
            pointsToPath(element.points, element.smoothing),
          )
          break
        }
        case "rectangle": {
          const rectElement = group.getElementsByTagName("rect")[0]
          rectElement.setAttribute("width", String(element.width))
          rectElement.setAttribute("height", String(element.height))
          break
        }
        case "ellipse": {
          const ellipseElement = group.getElementsByTagName("ellipse")[0]
          ellipseElement.setAttribute("cx", String(element.width / 2))
          ellipseElement.setAttribute("cy", String(element.height / 2))
          ellipseElement.setAttribute("rx", String(element.width / 2))
          ellipseElement.setAttribute("ry", String(element.height / 2))
          break
        }
      }
    }
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.svgElement?.remove()
  }
}
