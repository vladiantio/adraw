import type { Point, ToolType } from "../types.js"
import { panViewport } from "../viewport.js"
import type { Tool, ToolContext, ToolState } from "./base.js"
import { createBaseToolState } from "./base.js"

export function createHandTool(): Tool {
  const state: ToolState = createBaseToolState()

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
    },

    onPointerDown(_context: ToolContext, point: Point, _event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point
    },

    onPointerMove(context: ToolContext, _point: Point, event: PointerEvent) {
      if (state.currentPoint === null || !state.isActive) {
        return
      }

      const delta = {
        x: -event.movementX / context.getViewport().zoom,
        y: -event.movementY / context.getViewport().zoom,
      }

      const viewport = context.getViewport()
      const newViewport = panViewport(viewport, delta)

      context.setViewport(newViewport)
    },

    onPointerUp(_context: ToolContext, _point: Point, _event: PointerEvent) {
      state.startPoint = null
      state.currentPoint = null
    },

    getTemporaryElement() {
      return null
    },
  }
}
