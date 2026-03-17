import type { Point, ToolType } from "../types.js"
import { panViewport } from "../viewport.js"
import type { Tool, ToolContext, ToolState } from "./base.js"
import { createBaseToolState } from "./base.js"

export function createHandTool(): Tool {
  const state: ToolState = createBaseToolState()
  let lastPoint: Point | null = null

  return {
    type: "hand" as ToolType,
    cursor: "grab",

    onActivate() {
      state.isActive = true
    },

    onDeactivate() {
      state.isActive = false
      state.startPoint = null
      state.currentPoint = null
      lastPoint = null
    },

    onPointerDown(_context: ToolContext, point: Point, event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point
      lastPoint = { x: event.clientX, y: event.clientY }
    },

    onPointerMove(context: ToolContext, point: Point, event: PointerEvent) {
      if (lastPoint === null || !state.isActive) return

      const movementX =
        event.movementX !== undefined &&
        event.movementX !== 0 &&
        !Number.isNaN(event.movementX)
          ? event.movementX
          : lastPoint
            ? event.clientX - lastPoint.x || 0
            : null
      const movementY =
        event.movementY !== undefined &&
        event.movementY !== 0 &&
        !Number.isNaN(event.movementY)
          ? event.movementY
          : lastPoint
            ? event.clientY - lastPoint.y || 0
            : null

      if (!movementX || !movementY) return

      const viewport = context.getViewport()
      const delta = {
        x: -movementX / viewport.zoom,
        y: -movementY / viewport.zoom,
      }

      const newViewport = panViewport(viewport, delta)

      context.setViewport(newViewport)
      state.currentPoint = point
      lastPoint = { x: event.clientX, y: event.clientY }
    },

    onPointerUp(_context: ToolContext, _point: Point, _event: PointerEvent) {
      state.startPoint = null
      state.currentPoint = null
      lastPoint = null
    },

    getTemporaryElement() {
      return null
    },
  }
}
