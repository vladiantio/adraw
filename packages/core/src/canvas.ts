import { screenToCanvas } from "./coordinates.js"
import { getElementsBounds } from "./elements.js"
import {
  canRedo,
  canUndo,
  createHistoryState,
  pushHistory,
  redo,
  undo,
} from "./history.js"
import { createSnappingConfig, type SnappingConfig } from "./snapping.js"
import type { Tool, ToolContext } from "./tools/base.js"
import {
  createDrawTool,
  createEllipseTool,
  createEraserTool,
  createHandTool,
  createMediaTool,
  createRectangleTool,
  createSelectTool,
  createStarTool,
} from "./tools/index.js"
import type {
  CanvasElement,
  ElementId,
  ToolType,
  ViewportState,
} from "./types.js"
import {
  createViewport,
  panViewport,
  resetViewport,
  zoomViewport,
} from "./viewport.js"

export interface CanvasOptions {
  snapping?: Partial<SnappingConfig>
  initialViewport?: ViewportState
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

export class Canvas {
  private elements: Map<ElementId, CanvasElement> = new Map()
  private selectedIds: Set<ElementId> = new Set()
  private viewport: ViewportState
  private activeTool: Tool
  private snappingConfig: SnappingConfig
  private history = createHistoryState()
  private listeners: Map<keyof CanvasEventMap, Set<EventListener<any>>> =
    new Map()
  private canvasSize: { width: number; height: number } = {
    width: 0,
    height: 0,
  }

  private tools: Map<ToolType, Tool> = new Map()

  constructor(options: CanvasOptions = {}) {
    this.viewport = createViewport(options.initialViewport)
    this.snappingConfig = createSnappingConfig(options.snapping)

    this.tools.set("select", createSelectTool())
    this.tools.set("hand", createHandTool())
    this.tools.set("rectangle", createRectangleTool())
    this.tools.set("ellipse", createEllipseTool())
    this.tools.set("star", createStarTool())
    this.tools.set("draw", createDrawTool())
    this.tools.set("eraser", createEraserTool())
    this.tools.set("media", createMediaTool())

    this.activeTool = this.tools.get("select")!
    this.activeTool.onActivate(this.getToolContext())
  }

  private getToolContext(): ToolContext {
    return {
      getElements: () => this.elements,
      setElements: (elements) => {
        this.elements = elements
        this.emit("change", { elements: this.elements })
      },
      getSelectedIds: () => this.selectedIds,
      setSelectedIds: (ids) => {
        this.selectedIds = ids
        this.emit("selectionChange", { selectedIds: this.selectedIds })
      },
      getViewport: () => this.viewport,
      setViewport: (viewport) => {
        this.viewport = viewport
        this.emit("viewportChange", { viewport: this.viewport })
      },
      getCanvasSize: () => this.canvasSize,
      pushHistory: () => {
        this.history = pushHistory(
          this.history,
          this.elements,
          this.selectedIds,
        )
      },
      setActiveTool: (tool) => this.setActiveTool(tool),
    }
  }

  setCanvasSize(width: number, height: number): void {
    this.canvasSize = { width, height }
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

  handleWheel(event: WheelEvent): void {
    event.preventDefault()

    if (event.ctrlKey || event.metaKey) {
      const rect = (event.target as HTMLElement).getBoundingClientRect()
      const centerPoint = {
        x:
          (event.clientX - rect.left - rect.width / 2) / this.viewport.zoom +
          this.viewport.x,
        y:
          (event.clientY - rect.top - rect.height / 2) / this.viewport.zoom +
          this.viewport.y,
      }
      this.viewport = zoomViewport(this.viewport, -event.deltaY, centerPoint)
    } else {
      this.viewport = panViewport(this.viewport, {
        x: -event.deltaX / this.viewport.zoom,
        y: -event.deltaY / this.viewport.zoom,
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
        case "v":
          this.setActiveTool("select")
          break
        case "h":
          this.setActiveTool("hand")
          break
        case "d":
          this.setActiveTool("draw")
          break
        case "e":
          this.setActiveTool("eraser")
          break
        case "r":
          this.setActiveTool("rectangle")
          break
        case "s":
          this.setActiveTool("star")
          break
        case "m":
          this.setActiveTool("media")
          break
        case "delete":
        case "backspace":
          this.deleteSelected()
          break
        case "escape":
          this.clearSelection()
          break
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
}
