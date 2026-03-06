import type { CanvasElement, CanvasOptions, ToolType } from "@adraw/core"
import { Canvas } from "@adraw/core"

export interface VanillaCanvasOptions extends CanvasOptions {
  container: HTMLElement
}

export class VanillaCanvas {
  private canvas: Canvas
  private container: HTMLElement
  private svgElement: SVGSVGElement | null = null
  private elementsGroup: SVGGElement | null = null
  private temporaryGroup: SVGGElement | null = null
  private guidesGroup: SVGGElement | null = null
  private resizeObserver: ResizeObserver | null = null

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

  private setupEventListeners(): void {
    this.svgElement?.addEventListener("pointerdown", (event) => {
      this.canvas.handlePointerDown(event.clientX, event.clientY, event)
      this.render()
    })

    this.svgElement?.addEventListener("pointermove", (event) => {
      this.canvas.handlePointerMove(event.clientX, event.clientY, event)
      this.render()
    })

    this.svgElement?.addEventListener("pointerup", (event) => {
      this.canvas.handlePointerUp(event.clientX, event.clientY, event)
      this.render()
    })

    this.svgElement?.addEventListener(
      "wheel",
      (event) => {
        this.canvas.handleWheel(event)
        this.render()
      },
      { passive: false },
    )

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

  private updateCursor(tool: ToolType): void {
    const cursors: Record<ToolType, string> = {
      select: "default",
      hand: "grab",
      draw: "crosshair",
      eraser: "crosshair",
      rectangle: "crosshair",
      ellipse: "crosshair",
      star: "crosshair",
      media: "copy",
    }
    this.svgElement!.style.cursor = cursors[tool] || "default"
  }

  render(): void {
    const viewport = this.canvas.getViewport()

    this.elementsGroup!.setAttribute(
      "transform",
      `translate(${this.container.clientWidth / 2}, ${this.container.clientHeight / 2}) scale(${viewport.zoom}) translate(${-viewport.x}, ${-viewport.y})`,
    )

    this.temporaryGroup!.setAttribute(
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

      const group = this.createElementGroup(element)
      if (selectedIds.has(element.id)) {
        group.setAttribute("class", "adraw-element adraw-selected")
      } else {
        group.setAttribute("class", "adraw-element")
      }

      this.elementsGroup!.appendChild(group)
    }
  }

  private renderTemporary(): void {
    if (!this.temporaryGroup) return

    this.temporaryGroup.innerHTML = ""
    const tempElement = this.canvas.getTemporaryElement()

    if (tempElement) {
      const group = this.createElementGroup(tempElement)
      group.setAttribute("class", "adraw-temporary-element")
      this.temporaryGroup!.appendChild(group)
    }
  }

  private createElementGroup(element: CanvasElement): SVGGElement {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g")
    group.setAttribute("data-id", element.id)
    group.setAttribute(
      "transform",
      `translate(${element.x}, ${element.y}) rotate(${element.rotation})`,
    )

    switch (element.type) {
      case "rectangle": {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        )
        rect.setAttribute("width", String(element.width))
        rect.setAttribute("height", String(element.height))
        rect.setAttribute("rx", String(element.cornerRadius))
        rect.setAttribute("fill", "var(--adraw-fill-color, #ffffff)")
        rect.setAttribute("stroke", "var(--adraw-stroke-color, #000000)")
        rect.setAttribute("stroke-width", "2")
        group.appendChild(rect)
        break
      }

      case "ellipse": {
        const ellipse = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "ellipse",
        )
        ellipse.setAttribute("cx", String(element.width / 2))
        ellipse.setAttribute("cy", String(element.height / 2))
        ellipse.setAttribute("rx", String(element.width / 2))
        ellipse.setAttribute("ry", String(element.height / 2))
        ellipse.setAttribute("fill", "var(--adraw-fill-color, #ffffff)")
        ellipse.setAttribute("stroke", "var(--adraw-stroke-color, #000000)")
        ellipse.setAttribute("stroke-width", "2")
        group.appendChild(ellipse)
        break
      }

      case "star": {
        const starPoints = this.calculateStarPoints(
          element.width / 2,
          element.height / 2,
          element.points,
          element.innerRadius,
          element.outerRadius,
        )
        const star = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        )
        star.setAttribute("points", starPoints)
        star.setAttribute("fill", "var(--adraw-fill-color, #ffffff)")
        star.setAttribute("stroke", "var(--adraw-stroke-color, #000000)")
        star.setAttribute("stroke-width", "2")
        group.appendChild(star)
        break
      }

      case "path": {
        const pathData = this.pointsToPath(element.points)
        const path = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "path",
        )
        path.setAttribute("d", pathData)
        path.setAttribute("fill", element.fillColor || "none")
        path.setAttribute("stroke", element.strokeColor || "#000000")
        path.setAttribute("stroke-width", String(element.strokeWidth || 2))
        group.appendChild(path)
        break
      }

      case "media": {
        const image = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "image",
        )
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

  private calculateStarPoints(
    cx: number,
    cy: number,
    points: number,
    innerRadius: number,
    outerRadius: number,
  ): string {
    const result: string[] = []
    const step = Math.PI / points

    for (let i = 0; i < 2 * points; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = i * step - Math.PI / 2
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      result.push(`${x},${y}`)
    }

    return result.join(" ")
  }

  private pointsToPath(points: { x: number; y: number }[]): string {
    if (points.length === 0) return ""

    let d = `M ${points[0].x} ${points[0].y}`

    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`
    }

    return d
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
