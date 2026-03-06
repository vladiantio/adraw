import { getElementAtPoint } from "../elements.js"
import type { CanvasElement, ElementId, Point, ToolType } from "../types.js"
import type { Tool, ToolContext, ToolState } from "./base.js"
import { createBaseToolState } from "./base.js"

export interface SelectToolOptions {
  multiSelectModifier: "shift" | "ctrl"
}

export function createSelectTool(
  options: SelectToolOptions = { multiSelectModifier: "shift" },
): Tool {
  const state: ToolState = createBaseToolState()
  let dragStartElement: CanvasElement | null = null
  let dragStartPoint: Point | null = null
  const originalPositions: Map<ElementId, { x: number; y: number }> = new Map()

  return {
    type: "select" as ToolType,
    cursor: "default",

    onActivate() {
      state.isActive = true
    },

    onDeactivate() {
      state.isActive = false
      state.startPoint = null
      state.currentPoint = null
      dragStartElement = null
      dragStartPoint = null
      originalPositions.clear()
    },

    onPointerDown(context: ToolContext, point: Point, event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point

      const elements = context.getElements()
      const selectedIds = context.getSelectedIds()
      const element = getElementAtPoint(elements, point)

      const isMultiSelect =
        (options.multiSelectModifier === "shift" && event.shiftKey) ||
        (options.multiSelectModifier === "ctrl" && event.ctrlKey)

      if (element) {
        if (isMultiSelect) {
          if (selectedIds.has(element.id)) {
            const newSelected = new Set(selectedIds)
            newSelected.delete(element.id)
            context.setSelectedIds(newSelected)
          } else {
            const newSelected = new Set(selectedIds)
            newSelected.add(element.id)
            context.setSelectedIds(newSelected)
          }
        } else if (!selectedIds.has(element.id)) {
          context.setSelectedIds(new Set([element.id]))
        }

        dragStartElement = element
        dragStartPoint = point

        const selectedElements = context.getSelectedIds()
        for (const id of selectedElements) {
          const el = elements.get(id)
          if (el) {
            originalPositions.set(id, { x: el.x, y: el.y })
          }
        }
      } else {
        context.setSelectedIds(new Set())
      }
    },

    onPointerMove(context: ToolContext, point: Point, _event: PointerEvent) {
      if (!state.startPoint || !dragStartElement || !dragStartPoint) {
        return
      }

      state.currentPoint = point

      const delta = {
        x: point.x - dragStartPoint.x,
        y: point.y - dragStartPoint.y,
      }

      const elements = context.getElements()
      const selectedIds = context.getSelectedIds()

      for (const id of selectedIds) {
        const original = originalPositions.get(id)
        if (original) {
          const element = elements.get(id)
          if (element) {
            elements.set(id, {
              ...element,
              x: original.x + delta.x,
              y: original.y + delta.y,
            })
          }
        }
      }

      context.setElements(new Map(elements))
    },

    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      if (originalPositions.size > 0) {
        context.pushHistory()
      }

      state.startPoint = null
      state.currentPoint = null
      dragStartElement = null
      dragStartPoint = null
      originalPositions.clear()
    },

    getTemporaryElement() {
      return null
    },
  }
}
