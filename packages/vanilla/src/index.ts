import type {
  CanvasOptions,
  SnappingConfig,
  ToolType,
  ViewportState,
} from "@adraw/core"
import { Canvas, panViewport } from "@adraw/core"
import { createElementGroup } from "./utils"

export interface VanillaCanvasOptions extends CanvasOptions {
  container: HTMLElement
  initialViewport?: ViewportState
  snapping?: Partial<SnappingConfig>
}

export class VanillaCanvas {
  private canvas: Canvas
  private container: HTMLElement
  private svgElement: SVGSVGElement | null = null
  private elementsGroup: SVGGElement | null = null
  private temporaryGroup: SVGGElement | null = null
  private guidesGroup: SVGGElement | null = null
  private resizeObserver: ResizeObserver | null = null

  // Touch gesture state
  private pinchStartDistance: number | null = null
  private pinchStartCenter: { x: number; y: number } | null = null
  private pinchViewportState: ViewportState | null = null

  constructor(options: VanillaCanvasOptions) {
    this.container = options.container
    this.canvas = new Canvas({
      initialViewport: options.initialViewport,
      snapping: options.snapping,
    })

    this.init()
    this.setupEventListeners()
  }

  private init(): void {
    this.svgElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg",
    )
    this.svgElement.setAttribute("width", "100%")
    this.svgElement.setAttribute("height", "100%")
    this.svgElement.style.display = "block"
    this.svgElement.style.background = "var(--adraw-background, #ffffff)"
    this.svgElement.style.touchAction = "none"

    this.elementsGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    )
    this.elementsGroup.setAttribute("class", "adraw-elements")

    this.temporaryGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    )
    this.temporaryGroup.setAttribute("class", "adraw-temporary")

    this.guidesGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    )
    this.guidesGroup.setAttribute("class", "adraw-guides")

    this.svgElement.appendChild(this.elementsGroup)
    this.svgElement.appendChild(this.temporaryGroup)
    this.svgElement.appendChild(this.guidesGroup)
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
    if (!this.svgElement) return { x: event.clientX, y: event.clientY }
    const rect = this.svgElement.getBoundingClientRect()
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
  }

  private setupEventListeners(): void {
    this.svgElement?.addEventListener("pointerdown", (event) => {
      const { x, y } = this.getRelativePoint(event)
      this.canvas.handlePointerDown(x, y, event)
      this.render()
    })

    this.svgElement?.addEventListener("pointermove", (event) => {
      const { x, y } = this.getRelativePoint(event)
      this.canvas.handlePointerMove(x, y, event)
      this.render()
    })

    this.svgElement?.addEventListener("pointerup", (event) => {
      const { x, y } = this.getRelativePoint(event)
      this.canvas.handlePointerUp(x, y, event)
      this.render()
    })

    this.svgElement?.addEventListener(
      "wheel",
      (event) => {
        const { x, y } = this.getRelativePoint(event)
        this.canvas.handleWheel(event, x, y)
        this.render()
      },
      { passive: false },
    )

    this.svgElement?.addEventListener(
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
          // Pass single touch as pointer down
          this.canvas.handlePointerDown(
            event.touches[0].clientX,
            event.touches[0].clientY,
            event as unknown as PointerEvent, // Mock for simple coordinates
          )
          this.render()
        }
      },
      { passive: false },
    )

    this.svgElement?.addEventListener(
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
          if (!rect) return

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
          // so we calculate the zoom directly or simulate zoomViewport correctly.
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
          this.canvas.handlePointerMove(
            event.touches[0].clientX,
            event.touches[0].clientY,
            event as unknown as PointerEvent,
          )
          this.render()
        }
      },
      { passive: false },
    )

    this.svgElement?.addEventListener("touchend", (event) => {
      this.handleTouchEnd(event)
    })

    this.svgElement?.addEventListener("touchcancel", (event) => {
      this.handleTouchEnd(event)
    })

    document.addEventListener("keydown", (event) => {
      this.canvas.handleKeyDown(event)
      this.render()
    })

    this.canvas.on("change", () => {
      this.renderElements()
    })

    this.canvas.on("viewportChange", () => {
      this.render()
    })

    this.canvas.on("toolChange", ({ tool }: { tool: ToolType }) => {
      this.updateCursor(tool)
    })

    this.canvas.on("selectionChange", () => {
      this.renderElements()
    })
  }

  private handleTouchEnd(event: TouchEvent) {
    if (event.touches.length < 2) {
      this.pinchStartDistance = null
      this.pinchStartCenter = null
      this.pinchViewportState = null
    }

    if (event.touches.length === 0) {
      this.canvas.handlePointerUp(
        event.changedTouches[0].clientX,
        event.changedTouches[0].clientY,
        event as unknown as PointerEvent,
      )
      this.render()
    }
  }

  private updateCursor(tool: ToolType): void {
    const cursors: Record<ToolType, string> = {
      select: "default",
      hand: "grab",
      draw: "crosshair",
      eraser: "crosshair",
      rectangle: "crosshair",
      ellipse: "crosshair",
      media: "copy",
    }
    if (this.svgElement)
      this.svgElement.style.cursor = cursors[tool] || "default"
  }

  render(): void {
    const viewport = this.canvas.getViewport()

    if (this.elementsGroup)
      this.elementsGroup.setAttribute(
        "transform",
        `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`,
      )

    if (this.temporaryGroup)
      this.temporaryGroup.setAttribute(
        "transform",
        `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`,
      )

    this.renderTemporary()
  }

  private renderElements(): void {
    if (!this.elementsGroup) return

    this.elementsGroup.innerHTML = ""
    const elements = this.canvas.getElements()
    const selectedIds = this.canvas.getSelectedIds()

    for (const [, element] of elements) {
      if (!element.visible) continue

      const group = createElementGroup(element)
      if (selectedIds.has(element.id)) {
        group.setAttribute("class", "adraw-element adraw-selected")
      } else {
        group.setAttribute("class", "adraw-element")
      }

      if (this.elementsGroup) this.elementsGroup.appendChild(group)
    }
  }

  private renderTemporary(): void {
    if (!this.temporaryGroup) return

    this.temporaryGroup.innerHTML = ""
    const tempElement = this.canvas.getTemporaryElement()

    if (tempElement) {
      const group = createElementGroup(tempElement)
      group.setAttribute("class", "adraw-temporary-element")
      if (this.temporaryGroup) this.temporaryGroup.appendChild(group)
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
