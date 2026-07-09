// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { AdrawCanvas } from "../canvas"
import { createEllipse, createRectangle } from "../elements"
import type { CanvasElement, ElementId } from "../types"

function getOverlayGroupTransform(canvas: AdrawCanvas): string | null {
  const svg = (canvas as any).svgElement as SVGSVGElement | null
  if (!svg) {
    return null
  }
  const overlay = svg.querySelector(
    ".adraw-transform-overlay",
  ) as SVGGElement | null
  if (!overlay) {
    return null
  }
  const group = overlay.firstElementChild as SVGElement | null
  if (!group) {
    return null
  }
  return group.getAttribute("transform")
}

describe("transform overlay rotation with multi-selection", () => {
  let container: HTMLDivElement
  let canvas: AdrawCanvas

  function setElements(elements: CanvasElement[]) {
    ;(canvas as any).elements = new Map<ElementId, CanvasElement>(
      elements.map((el) => [el.id, el]),
    )
  }

  function setSelectedIds(ids: ElementId[]) {
    ;(canvas as any).selectedIds = new Set(ids)
  }

  beforeEach(() => {
    container = document.createElement("div")
    container.style.width = "800px"
    container.style.height = "600px"
    document.body.appendChild(container)
    canvas = new AdrawCanvas({ container })
  })

  afterEach(() => {
    canvas.destroy()
    container.remove()
  })

  it("rotates overlay for a single rotated element", () => {
    const rect = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 45,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    setElements([rect])
    setSelectedIds([rect.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBe("rotate(45, 50, 50)")
  })

  it("does not rotate overlay for a single element with zero rotation", () => {
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
    setElements([rect])
    setSelectedIds([rect.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBeNull()
  })

  it("rotates overlay when all selected elements share the same rotation", () => {
    const a = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 90,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const b = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 90,
      visible: true,
      width: 100,
      x: 200,
      y: 0,
      zIndex: 0,
    })
    setElements([a, b])
    setSelectedIds([a.id, b.id])
    canvas.render()

    // Bounds: x=0, y=0, width=300, height=100 → center (150, 50)
    expect(getOverlayGroupTransform(canvas)).toBe("rotate(90, 150, 50)")
  })

  it("does not rotate overlay when selected elements have different rotations", () => {
    const a = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 45,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const b = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 90,
      visible: true,
      width: 100,
      x: 200,
      y: 0,
      zIndex: 0,
    })
    setElements([a, b])
    setSelectedIds([a.id, b.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBeNull()
  })

  it("does not rotate overlay when selected elements all have zero rotation", () => {
    const a = createRectangle({
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
    const b = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 0,
      visible: true,
      width: 100,
      x: 200,
      y: 0,
      zIndex: 0,
    })
    setElements([a, b])
    setSelectedIds([a.id, b.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBeNull()
  })

  it("does not rotate overlay when some selected elements have zero and others non-zero rotation", () => {
    const a = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 45,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const b = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 0,
      visible: true,
      width: 100,
      x: 200,
      y: 0,
      zIndex: 0,
    })
    setElements([a, b])
    setSelectedIds([a.id, b.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBeNull()
  })

  it("rotates overlay with ellipse elements sharing the same rotation", () => {
    const a = createEllipse({
      height: 100,
      locked: false,
      rotation: 30,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const b = createEllipse({
      height: 100,
      locked: false,
      rotation: 30,
      visible: true,
      width: 100,
      x: 150,
      y: 50,
      zIndex: 0,
    })
    setElements([a, b])
    setSelectedIds([a.id, b.id])
    canvas.render()

    // Bounds: x=0, y=0, width=250, height=150 → center (125, 75)
    expect(getOverlayGroupTransform(canvas)).toBe("rotate(30, 125, 75)")
  })

  it("removes overlay rotation when selection changes from common-rotation to mixed-rotation", () => {
    const a = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 90,
      visible: true,
      width: 100,
      x: 0,
      y: 0,
      zIndex: 0,
    })
    const b = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 90,
      visible: true,
      width: 100,
      x: 200,
      y: 0,
      zIndex: 0,
    })
    const c = createRectangle({
      cornerRadius: 0,
      height: 100,
      locked: false,
      rotation: 45,
      visible: true,
      width: 100,
      x: 400,
      y: 0,
      zIndex: 0,
    })
    setElements([a, b, c])
    setSelectedIds([a.id, b.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBe("rotate(90, 150, 50)")

    // Add element c (different rotation)
    setSelectedIds([a.id, b.id, c.id])
    canvas.render()

    expect(getOverlayGroupTransform(canvas)).toBeNull()
  })
})
