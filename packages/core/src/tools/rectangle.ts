import { createRectangle } from "../elements.js"
import type { Point, RectangleElement, ToolType } from "../types.js"
import type { Tool, ToolContext, ToolOptions, ToolState } from "./base.js"
import {
  calculateBounds,
  createBaseToolState,
  getDefaultToolOptions,
} from "./base.js"

export interface RectangleToolOptions extends ToolOptions {
  cornerRadius?: number
}

export function createRectangleTool(options: RectangleToolOptions = {}): Tool {
  const state: ToolState = createBaseToolState()
  const toolOptions = { ...getDefaultToolOptions(), ...options }
  let temporaryElement: RectangleElement | null = null

  return {
    type: "rectangle" as ToolType,
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

      temporaryElement = createRectangle({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: 0,
        zIndex: 0,
        locked: false,
        visible: true,
        cornerRadius: toolOptions.cornerRadius ?? 0,
      })
    },

    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      if (!state.startPoint || !state.currentPoint) {
        return
      }

      const bounds = calculateBounds(state.startPoint, state.currentPoint)

      if (bounds.width > 5 && bounds.height > 5) {
        const element = createRectangle({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          rotation: 0,
          zIndex: context.getElements().size,
          locked: false,
          visible: true,
          cornerRadius: toolOptions.cornerRadius ?? 0,
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
