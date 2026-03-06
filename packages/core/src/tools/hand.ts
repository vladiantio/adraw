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

    onPointerDown(_context: ToolContext, point: Point, _event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point
      lastPoint = point
    },

    onPointerMove(context: ToolContext, point: Point, _event: PointerEvent) {
      if (!lastPoint || !state.isActive) {
        return
      }

      state.currentPoint = point

      const delta = {
        x: point.x - lastPoint.x,
        y: point.y - lastPoint.y,
      }

      const viewport = context.getViewport()
      const newViewport = panViewport(viewport, delta)

      context.setViewport(newViewport)
      lastPoint = point
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
