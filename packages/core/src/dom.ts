import { Canvas, type CanvasOptions } from "./canvas"
import { getElementsBounds } from "./elements"
import type { SnappingConfig } from "./snapping"
import type { CanvasElement, Point, ToolType, ViewportState } from "./types"
import { panViewport } from "./viewport"

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

export function pointsToPath(points: Point[]): string {
  if (points.length === 0) {
    return ""
  }

  let d = `M ${points[0].x} ${points[0].y}`

  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`
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
      const pathData = pointsToPath(element.points)
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

export interface AdrawCanvasOptions extends CanvasOptions {
  container: HTMLElement
  initialViewport?: ViewportState
  snapping?: Partial<SnappingConfig>
}

export class AdrawCanvas {
  private canvas: Canvas
  private container: HTMLElement
  private svgElement: SVGSVGElement | null = null
  private elementsGroup: SVGGElement | null = null
  private temporaryGroup: SVGGElement | null = null
  private guidesGroup: SVGGElement | null = null
  private transformOverlay: SVGGElement | null = null
  private resizeObserver: ResizeObserver | null = null
  // Private isDragging: boolean = false

  // Touch gesture state
  private pinchStartDistance: number | null = null
  private pinchStartCenter: { x: number; y: number } | null = null
  private pinchViewportState: ViewportState | null = null

  constructor(options: AdrawCanvasOptions) {
    this.container = options.container
    this.canvas = new Canvas({
      initialViewport: options.initialViewport,
      snapping: options.snapping,
    })

    this.init()
    this.setupEventListeners()
  }

  private init(): void {
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
        this.canvas.setCanvasSize(width, height)
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
      this.handlePointerDown(event)
      this.render()
    })

    this.svgElement.addEventListener("pointermove", (event) => {
      this.handlePointerMove(event)
      this.render()
    })

    this.svgElement.addEventListener("pointerup", (event) => {
      this.handlePointerUp(event)
      this.render()
    })

    // Set cursor based on hovered handle
    this.svgElement.addEventListener("pointermove", (event) => {
      if (!this.svgElement) {
        return
      }
      const target = event.target as HTMLElement
      const anchor = target.getAttribute("data-anchor")
      const cursorMap: Record<string, string> = {
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
      if (anchor && cursorMap[anchor]) {
        this.svgElement.style.cursor = cursorMap[anchor]
      } else if (!this.svgElement.style.cursor.startsWith("grab")) {
        this.svgElement.style.cursor = "default"
      }
    })

    this.svgElement.addEventListener(
      "wheel",
      (event) => {
        const { x, y } = this.getRelativePoint(event)
        this.canvas.handleWheel(event, x, y)
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
          this.pinchViewportState = { ...this.canvas.getViewport() }
        } else if (event.touches.length === 1) {
          this.handlePointerDown(event.touches[0] as unknown as PointerEvent)
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

          // Calculate zoom based on the ratio. zoomViewport takes deltaY which we don't naturally have here,
          // So we calculate the zoom directly or simulate zoomViewport correctly.
          // Since core zoomViewport uses deltaY logic, let's just use it with a proportional delta.
          // Or update viewport directly:
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

          this.canvas.setViewport(newViewport)
          this.render()
        } else if (event.touches.length === 1 && !this.pinchStartDistance) {
          this.handlePointerMove(event.touches[0] as unknown as PointerEvent)
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
      this.canvas.handleKeyDown(event)
      this.render()
    })

    this.canvas.on("change", () => {
      const activeTool = this.canvas.getActiveTool()
      if (activeTool === "select") {
        this.selectElements()
      } else {
        this.renderElements()
      }
    })

    this.canvas.on("viewportChange", () => {
      this.render()
    })

    this.canvas.on("toolChange", ({ tool }: { tool: ToolType }) => {
      this.updateCursor(tool)
    })

    this.canvas.on("selectionChange", () => {
      this.selectElements()
    })
  }

  private handlePointerDown(event: PointerEvent) {
    const { x, y } = this.getRelativePoint(event)
    this.canvas.handlePointerDown(x, y, event)
  }

  private handlePointerMove(event: PointerEvent) {
    const { x, y } = this.getRelativePoint(event)
    this.canvas.handlePointerMove(x, y, event)
  }

  private handlePointerUp(event: PointerEvent) {
    const { x, y } = this.getRelativePoint(event)
    this.canvas.handlePointerUp(x, y, event)
  }

  private handleTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.pinchStartDistance = null
      this.pinchStartCenter = null
      this.pinchViewportState = null
    }

    if (event.touches.length === 0) {
      this.handlePointerUp(event.changedTouches[0] as unknown as PointerEvent)
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
    const viewport = this.canvas.getViewport()

    if (this.elementsGroup) {
      this.elementsGroup.setAttribute(
        "transform",
        `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`,
      )
    }

    if (this.temporaryGroup) {
      this.temporaryGroup.setAttribute(
        "transform",
        `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`,
      )
    }

    if (this.transformOverlay) {
      this.transformOverlay.setAttribute(
        "transform",
        `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`,
      )
    }

    this.renderTemporary()
    this.renderTransformOverlay()
  }

  private renderTransformOverlay(): void {
    if (!this.transformOverlay) {
      return
    }

    this.transformOverlay.innerHTML = ""
    const selectedIds = this.canvas.getSelectedIds()
    const elements = this.canvas.getElements()

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
    const elements = this.canvas.getElements()
    const selectedIds = this.canvas.getSelectedIds()

    for (const [, element] of elements) {
      if (!element.visible) {
        continue
      }

      const group = createElementGroup(element)
      const isSelected = selectedIds.has(element.id)
      group.classList.add(elementClass)
      group.classList.toggle(selectedClass, isSelected)

      if (this.elementsGroup) {
        this.elementsGroup.appendChild(group)
      }
    }
  }

  private renderTemporary(): void {
    if (!this.temporaryGroup) {
      return
    }

    this.temporaryGroup.innerHTML = ""
    const tempElement = this.canvas.getTemporaryElement()

    if (tempElement) {
      const group = createElementGroup(tempElement)
      group.classList.add(temporaryClass)
      if (this.temporaryGroup) {
        this.temporaryGroup.appendChild(group)
      }
    }
  }

  private selectElements(): void {
    const elements = this.canvas.getElements()
    const selectedIds = this.canvas.getSelectedIds()

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
          pathElement.setAttribute("d", pointsToPath(element.points))
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

  getCore(): Canvas {
    return this.canvas
  }

  setActiveTool(tool: ToolType): void {
    this.canvas.setActiveTool(tool)
  }

  getActiveTool(): ToolType {
    return this.canvas.getActiveTool()
  }

  undo(): boolean {
    return this.canvas.undo()
  }

  redo(): boolean {
    return this.canvas.redo()
  }

  canUndo(): boolean {
    return this.canvas.canUndo()
  }

  canRedo(): boolean {
    return this.canvas.canRedo()
  }

  zoomIn(): void {
    this.canvas.zoomIn()
  }

  zoomOut(): void {
    this.canvas.zoomOut()
  }

  resetZoom(): void {
    this.canvas.resetZoom()
  }

  zoomToFit(): void {
    this.canvas.zoomToFit()
  }

  destroy(): void {
    this.resizeObserver?.disconnect()
    this.svgElement?.remove()
  }
}
