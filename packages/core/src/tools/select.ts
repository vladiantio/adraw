import {
  getElementAtPoint,
  getElementsBounds,
  rotateElement,
} from "../elements"
import type { CanvasElement, ElementId, Point, ToolType } from "../types"
import {
  createBaseToolState,
  type Tool,
  type ToolContext,
  type ToolState,
} from "./base"

export interface SelectToolOptions {
  multiSelectModifier: "shift" | "ctrl"
}

export function createSelectTool(
  options: SelectToolOptions = { multiSelectModifier: "shift" },
): Tool {
  const state: ToolState = createBaseToolState()
  let dragStartElement: CanvasElement | null = null
  let dragStartPoint: Point | null = null
  const originalPositions = new Map<
    ElementId,
    { x: number; y: number; width: number; height: number; rotation: number }
  >()
  let dragHandle: string | null = null
  let rotationCenter: Point | null = null
  let originalBounds: {
    x: number
    y: number
    width: number
    height: number
  } | null = null

  return {
    cursor: "default",
    getTemporaryElement() {
      return null
    },
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
      originalBounds = null
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
            height: el.height,
            rotation: el.rotation,
            width: el.width,
            x: el.x,
            y: el.y,
          })
        }
      }

      // Capture the bounding box of the selection at drag start. Both rotation
      // and resize must reference this constant snapshot, never the live
      // (already-mutated) elements, otherwise the transform feeds back on itself.
      if (selectedElements.size > 0) {
        const bounds = getElementsBounds(elements, selectedElements)
        if (bounds) {
          originalBounds = {
            height: bounds.height,
            width: bounds.width,
            x: bounds.x,
            y: bounds.y,
          }
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
      } else if (dragHandle && dragHandle !== "rotation" && originalBounds) {
        // Resize selected elements relative to the snapshot taken on
        // pointer-down so the transform tracks the pointer instead of feeding
        // back on the elements it just mutated.
        const bounds = originalBounds
        const movesLeft =
          dragHandle === "top-left" ||
          dragHandle === "bottom-left" ||
          dragHandle === "left-center"
        const movesTop =
          dragHandle === "top-left" ||
          dragHandle === "top-right" ||
          dragHandle === "top-center"
        const changesWidth =
          dragHandle !== "top-center" && dragHandle !== "bottom-center"
        const changesHeight =
          dragHandle !== "left-center" && dragHandle !== "right-center"

        // The corner/edge opposite the dragged handle stays fixed.
        const anchorX = movesLeft ? bounds.x + bounds.width : bounds.x
        const anchorY = movesTop ? bounds.y + bounds.height : bounds.y

        const newWidth = changesWidth
          ? movesLeft
            ? anchorX - point.x
            : point.x - anchorX
          : bounds.width
        const newHeight = changesHeight
          ? movesTop
            ? anchorY - point.y
            : point.y - anchorY
          : bounds.height

        const scaleX = changesWidth ? newWidth / bounds.width : 1
        const scaleY = changesHeight ? newHeight / bounds.height : 1

        for (const id of selectedIds) {
          const original = originalPositions.get(id)
          if (original) {
            const element = elements.get(id)
            if (element) {
              // Scale each element's size and position relative to the fixed
              // anchor so multi-element selections keep their layout.
              const newX = anchorX + (original.x - anchorX) * scaleX
              const newY = anchorY + (original.y - anchorY) * scaleY
              const newElementWidth = original.width * scaleX
              const newElementHeight = original.height * scaleY

              elements.set(id, {
                ...element,
                height: Math.max(1, newElementHeight),
                width: Math.max(1, newElementWidth),
                x: newX,
                y: newY,
              })
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
      originalBounds = null
      originalPositions.clear()
    },
    type: "select" as ToolType,
  }
}
