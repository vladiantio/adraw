import {
  AdrawCanvas,
  type CanvasElement,
  type ElementId,
  type ToolType,
  type ViewportState,
} from "@adraw/core"
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  type Provider,
  signal,
} from "@angular/core"

import { CANVAS_OPTIONS, type CanvasAngularOptions } from "./canvas.tokens"

// One AdrawCanvas per service instance. The core is created headless in the
// constructor and mounted later by <adraw-canvas>, so every method here is
// safe to call before mount — it just operates on headless state. Core state
// is mirrored into Angular signals by subscribing to the four core events.
@Injectable()
export class CanvasService {
  private readonly core: AdrawCanvas

  private readonly _elements = signal<Map<ElementId, CanvasElement>>(new Map())
  private readonly _viewport = signal<ViewportState>({ x: 0, y: 0, zoom: 1 })
  private readonly _activeTool = signal<ToolType>("select")
  private readonly _selectedIds = signal<Set<ElementId>>(new Set())

  // Read-only views of the mirrored core state. Consumers read them by calling
  // the signal (including in templates); state only ever changes via the core.
  readonly elements = this._elements.asReadonly()
  readonly viewport = this._viewport.asReadonly()
  readonly activeTool = this._activeTool.asReadonly()
  readonly selectedIds = this._selectedIds.asReadonly()

  // Bumped on every "change" event (draw, erase, undo, redo, delete) so the
  // canUndo/canRedo computeds recompute even though the core's history stack
  // isn't itself reactive.
  private readonly historyVersion = signal(0)

  readonly canUndo = computed(() => {
    this.historyVersion()
    return this.core.canUndo()
  })

  readonly canRedo = computed(() => {
    this.historyVersion()
    return this.core.canRedo()
  })

  constructor() {
    const options = inject(CANVAS_OPTIONS, { optional: true })
    this.core = new AdrawCanvas(options ?? {})

    this._elements.set(new Map(this.core.getElements()))
    this._viewport.set(this.core.getViewport())
    this._activeTool.set(this.core.getActiveTool())
    this._selectedIds.set(new Set(this.core.getSelectedIds()))

    this.core.on("change", ({ elements }) => {
      this._elements.set(new Map(elements))
      this.historyVersion.update((v) => v + 1)
    })
    this.core.on("viewportChange", ({ viewport }) => {
      this._viewport.set(viewport)
    })
    this.core.on("toolChange", ({ tool }) => {
      this._activeTool.set(tool)
    })
    this.core.on("selectionChange", ({ selectedIds }) => {
      this._selectedIds.set(new Set(selectedIds))
    })

    inject(DestroyRef).onDestroy(() => {
      this.core.destroy()
    })
  }

  /** The underlying vanilla AdrawCanvas instance. */
  get instance(): AdrawCanvas {
    return this.core
  }

  /** Mount the canvas into a container element (called by <adraw-canvas>). */
  mount(container: HTMLElement): void {
    this.core.mount(container)
    this.core.render()
  }

  setTool(tool: ToolType): void {
    this.core.setActiveTool(tool)
  }

  setViewport(viewport: ViewportState): void {
    this.core.setViewport(viewport)
  }

  zoomIn(): void {
    this.core.zoomIn()
  }

  zoomOut(): void {
    this.core.zoomOut()
  }

  resetZoom(): void {
    this.core.resetZoom()
  }

  zoomToFit(): void {
    this.core.zoomToFit()
  }

  undo(): boolean {
    return this.core.undo()
  }

  redo(): boolean {
    return this.core.redo()
  }

  selectAll(): void {
    this.core.selectAll()
  }

  clearSelection(): void {
    this.core.clearSelection()
  }

  deleteSelected(): void {
    this.core.deleteSelected()
  }
}

// Registers a component-scoped CanvasService (plus its options, when given).
// Add it to the `providers` of the component that hosts both <adraw-canvas>
// and any toolbar/controls, so they all inject the same instance. Each
// component that calls provideCanvas() gets its own independent canvas, so
// multiple canvases can coexist on one page.
export function provideCanvas(options?: CanvasAngularOptions): Provider[] {
  const providers: Provider[] = [CanvasService]
  if (options) {
    providers.push({ provide: CANVAS_OPTIONS, useValue: options })
  }
  return providers
}
