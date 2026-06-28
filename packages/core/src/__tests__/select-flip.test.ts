import { beforeEach, describe, expect, it } from "vitest"

import { createPath, createRectangle } from "../elements"
import type { ToolContext } from "../tools/base"
import { createSelectTool } from "../tools/select"
import type { CanvasElement, ElementId, Point } from "../types"

function makeContext(elements: CanvasElement[]) {
  let elementMap = new Map<ElementId, CanvasElement>(
    elements.map((el) => [el.id, el]),
  )
  let selectedIds = new Set<ElementId>()
  const context: ToolContext = {
    getCanvasSize: () => ({ height: 600, width: 800 }),
    getElements: () => elementMap,
    getSelectedIds: () => selectedIds,
    getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    pushHistory: () => {},
    setActiveTool: () => {},
    setElements: (next) => {
      elementMap = next
    },
    setSelectedIds: (next) => {
      selectedIds = next
    },
    setViewport: () => {},
  }
  return context
}

// Pointer events in tests only need `target.getAttribute("data-anchor")` and
// the modifier flags the select tool reads.
function pointerEvent(anchor: string | null): PointerEvent {
  return {
    ctrlKey: false,
    shiftKey: false,
    target: {
      getAttribute: (name: string) => (name === "data-anchor" ? anchor : null),
    },
  } as unknown as PointerEvent
}

function dragHandle(
  tool: ReturnType<typeof createSelectTool>,
  context: ToolContext,
  anchor: string,
  from: Point,
  to: Point,
) {
  tool.onPointerDown(context, from, pointerEvent(anchor))
  tool.onPointerMove(context, to, pointerEvent(anchor))
  tool.onPointerUp(context, to, pointerEvent(null))
}

describe("select tool resize flipping", () => {
  let tool: ReturnType<typeof createSelectTool>

  beforeEach(() => {
    tool = createSelectTool()
  })

  it("flips a rectangle horizontally when the left handle is dragged past the right edge", () => {
    const rect = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 0,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const context = makeContext([rect])
    context.setSelectedIds(new Set([rect.id]))

    // Right edge (the anchor for a left-center handle) sits at x=100.
    // Drag the left-center handle from x=0 to x=150 — 50px past the anchor.
    dragHandle(tool, context, "left-center", { x: 0, y: 50 }, { x: 150, y: 50 })

    const result = context.getElements().get(rect.id)!
    // The box now lives to the right of the anchor: x in [100, 150].
    expect(result.x).toBeCloseTo(100)
    expect(result.width).toBeCloseTo(50)
    expect(result.height).toBeCloseTo(100)
  })

  it("flips a rectangle vertically when the top handle is dragged past the bottom edge", () => {
    const rect = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 0,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const context = makeContext([rect])
    context.setSelectedIds(new Set([rect.id]))

    // Bottom edge (anchor for top-center) is y=100; drag from y=0 to y=160.
    dragHandle(tool, context, "top-center", { x: 50, y: 0 }, { x: 50, y: 160 })

    const result = context.getElements().get(rect.id)!
    expect(result.y).toBeCloseTo(100)
    expect(result.height).toBeCloseTo(60)
    expect(result.width).toBeCloseTo(100)
  })

  it("mirrors a path's points when a corner handle is dragged across the anchor", () => {
    // An L-shaped path so the mirror is observable: points at the bbox edges.
    const path = createPath({
      fillColor: "transparent",
      height: 100,
      locked: false,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 100 },
        { x: 100, y: 100 },
      ],
      rotation: 0,
      strokeColor: "#000",
      strokeWidth: 2,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const context = makeContext([path])
    context.setSelectedIds(new Set([path.id]))

    // top-left handle anchors at the bottom-right corner (100, 100).
    // Drag it to (200, 100): horizontally past the anchor, no vertical change.
    dragHandle(tool, context, "top-left", { x: 0, y: 0 }, { x: 200, y: 100 })

    const result = context.getElements().get(path.id)
    if (result?.type !== "path") {
      throw new Error("expected path")
    }
    // Mirrored across x=100: x=0 -> 200, x=100 -> 100. Bbox is [100, 200].
    expect(result.x).toBeCloseTo(100)
    expect(result.width).toBeCloseTo(100)
    const xs = result.points.map((p) => p.x).toSorted((a, b) => a - b)
    expect(xs[0]).toBeCloseTo(100)
    expect(xs[xs.length - 1]).toBeCloseTo(200)
  })

  it("keeps a non-flipped resize behaving normally", () => {
    const rect = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 0,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const context = makeContext([rect])
    context.setSelectedIds(new Set([rect.id]))

    // Drag the right-center handle outward from x=100 to x=200.
    dragHandle(
      tool,
      context,
      "right-center",
      { x: 100, y: 50 },
      { x: 200, y: 50 },
    )

    const result = context.getElements().get(rect.id)!
    expect(result.x).toBeCloseTo(0)
    expect(result.width).toBeCloseTo(200)
  })
})
