import {
  getElementAtPoint,
  getElementsBounds,
  resizeElement,
  rotateElement,
} from "../elements"
import type { CanvasElement, ElementId, Point, ToolType } from "../types"
import type { Tool, ToolContext, ToolState } from "./base"
import { createBaseToolState } from "./base"

export interface SelectToolOptions {
  multiSelectModifier: "shift" | "ctrl"
}

export function createSelectTool(
  options: SelectToolOptions = { multiSelectModifier: "shift" },
): Tool {
  const state: ToolState = createBaseToolState()
  let dragStartElement: CanvasElement | null = null
  let dragStartPoint: Point | null = null
  const originalPositions: Map<
    ElementId,
    { x: number; y: number; width: number; height: number; rotation: number }
  > = new Map()
  let dragHandle: string | null = null
  let rotationCenter: Point | null = null

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
      dragHandle = null
      rotationCenter = null
      originalPositions.clear()
    },

    onPointerDown(context: ToolContext, point: Point, event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point

      const elements = context.getElements()
      const selectedIds = context.getSelectedIds()

      // Check if we clicked on a resize handle or rotation handle (only in vanilla for now)
      // For other frameworks, this would be handled by their event systems
      const target = event.target as HTMLElement
      dragHandle = target.getAttribute("data-anchor")

      if (!dragHandle) {
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
        } else {
          context.setSelectedIds(new Set())
        }
      }

      const selectedElements = context.getSelectedIds()
      for (const id of selectedElements) {
        const el = elements.get(id)
        if (el) {
          originalPositions.set(id, {
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
          })
        }
      }

      // Calculate rotation center (bounding box center of selected elements)
      if (selectedElements.size > 0) {
        const bounds = getElementsBounds(elements, selectedElements)
        if (bounds) {
          rotationCenter = {
            x: bounds.x + bounds.width / 2,
            y: bounds.y + bounds.height / 2,
          }
        }
      }
    },

    onPointerMove(context: ToolContext, point: Point, _event: PointerEvent) {
      if (!state.startPoint) {
        return
      }

      state.currentPoint = point
      const elements = context.getElements()
      const selectedIds = context.getSelectedIds()

      if (dragHandle === "rotation" && rotationCenter) {
        // Rotate selected elements
        const startAngle = Math.atan2(
          state.startPoint.y - rotationCenter.y,
          state.startPoint.x - rotationCenter.x,
        )
        const currentAngle = Math.atan2(
          point.y - rotationCenter.y,
          point.x - rotationCenter.x,
        )
        const deltaAngle = (currentAngle - startAngle) * (180 / Math.PI)

        for (const id of selectedIds) {
          const original = originalPositions.get(id)
          if (original) {
            const element = elements.get(id)
            if (element) {
              elements.set(
                id,
                rotateElement(element, original.rotation + deltaAngle),
              )
            }
          }
        }
        context.setElements(new Map(elements))
      } else if (dragHandle && dragHandle !== "rotation") {
        // Resize selected elements
        const bounds = getElementsBounds(elements, selectedIds)
        if (!bounds) return

        // Calculate new dimensions based on drag handle
        let newWidth = bounds.width
        let newHeight = bounds.height

        switch (dragHandle) {
          case "top-left":
            newWidth = bounds.width + (bounds.x - point.x)
            newHeight = bounds.height + (bounds.y - point.y)
            break
          case "top-right":
            newWidth = point.x - bounds.x
            newHeight = bounds.height + (bounds.y - point.y)
            break
          case "bottom-left":
            newWidth = bounds.width + (bounds.x - point.x)
            newHeight = point.y - bounds.y
            break
          case "bottom-right":
            newWidth = point.x - bounds.x
            newHeight = point.y - bounds.y
            break
          case "top-center":
            newHeight = bounds.height + (bounds.y - point.y)
            break
          case "bottom-center":
            newHeight = point.y - bounds.y
            break
          case "left-center":
            newWidth = bounds.width + (bounds.x - point.x)
            break
          case "right-center":
            newWidth = point.x - bounds.x
            break
        }

        // Resize each selected element
        for (const id of selectedIds) {
          const original = originalPositions.get(id)
          if (original) {
            const element = elements.get(id)
            if (element) {
              const scaleX = newWidth / bounds.width
              const scaleY = newHeight / bounds.height

              // Calculate new dimensions for each element
              const newElementWidth = original.width * scaleX
              const newElementHeight = original.height * scaleY

              // Resize element
              elements.set(
                id,
                resizeElement(
                  element,
                  newElementWidth,
                  newElementHeight,
                  "center",
                ),
              )
            }
          }
        }
        context.setElements(new Map(elements))
      } else if (dragStartElement && dragStartPoint) {
        // Move selected elements
        const delta = {
          x: point.x - dragStartPoint.x,
          y: point.y - dragStartPoint.y,
        }

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
      }
    },

    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      if (originalPositions.size > 0) {
        context.pushHistory()
      }

      state.startPoint = null
      state.currentPoint = null
      dragStartElement = null
      dragStartPoint = null
      dragHandle = null
      rotationCenter = null
      originalPositions.clear()
    },

    getTemporaryElement() {
      return null
    },
  }
}
