import { createEllipse } from "../elements"
import type { EllipseElement, Point, ToolType } from "../types"
import type { Tool, ToolContext, ToolState } from "./base"
import { calculateBounds, createBaseToolState } from "./base"

export type EllipseToolOptions = {}

export function createEllipseTool(_options: EllipseToolOptions = {}): Tool {
  const state: ToolState = createBaseToolState()
  let temporaryElement: EllipseElement | null = null

  return {
    type: "ellipse" as ToolType,
    cursor: "crosshair",

    onActivate() {
      state.isActive = true
    },

    onDeactivate() {
      state.isActive = false
      state.startPoint = null
      state.currentPoint = null
      temporaryElement = null
    },

    onPointerDown(_context: ToolContext, point: Point, _event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point
    },

    onPointerMove(_context: ToolContext, point: Point, _event: PointerEvent) {
      if (!state.startPoint) {
        return
      }

      state.currentPoint = point

      const bounds = calculateBounds(state.startPoint, point)

      temporaryElement = createEllipse({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        zIndex: 0,
        locked: false,
        visible: true,
      })
    },

    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      if (!state.startPoint || !state.currentPoint) {
        return
      }

      const bounds = calculateBounds(state.startPoint, state.currentPoint)

      if (bounds.width > 5 && bounds.height > 5) {
        const element = createEllipse({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          rotation: 0,
          zIndex: context.getElements().size,
          locked: false,
          visible: true,
        })

        const elements = context.getElements()
        elements.set(element.id, element)
        context.setElements(elements)
        context.setSelectedIds(new Set([element.id]))
        context.pushHistory()
      }

      state.startPoint = null
      state.currentPoint = null
      temporaryElement = null
    },

    getTemporaryElement() {
      return temporaryElement
    },
  }
}
