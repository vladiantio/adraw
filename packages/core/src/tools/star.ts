import { createStar } from "../elements.js"
import type { Point, StarElement, ToolType } from "../types.js"
import type { Tool, ToolContext, ToolState } from "./base.js"
import { calculateBounds, createBaseToolState } from "./base.js"

export interface StarToolOptions {
  points?: number
  innerRadiusRatio?: number
}

export function createStarTool(options: StarToolOptions = {}): Tool {
  const state: ToolState = createBaseToolState()
  const points = options.points ?? 5
  const innerRadiusRatio = options.innerRadiusRatio ?? 0.5
  let temporaryElement: StarElement | null = null

  return {
    type: "star" as ToolType,
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
      const outerRadius = Math.min(bounds.width, bounds.height) / 2
      const innerRadius = outerRadius * innerRadiusRatio

      temporaryElement = createStar({
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height / 2,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        zIndex: 0,
        locked: false,
        visible: true,
        points,
        innerRadius,
        outerRadius,
      })
    },

    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      if (!state.startPoint || !state.currentPoint) {
        return
      }

      const bounds = calculateBounds(state.startPoint, state.currentPoint)

      if (bounds.width > 5 && bounds.height > 5) {
        const outerRadius = Math.min(bounds.width, bounds.height) / 2
        const innerRadius = outerRadius * innerRadiusRatio

        const element = createStar({
          x: bounds.x + bounds.width / 2,
          y: bounds.y + bounds.height / 2,
          width: bounds.width,
          height: bounds.height,
          rotation: 0,
          zIndex: context.getElements().size,
          locked: false,
          visible: true,
          points,
          innerRadius,
          outerRadius,
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
