import {
  getElementAtPoint,
  getElementsBounds,
  rotateElement,
} from "../elements"
import type {
  BoundingBox,
  CanvasElement,
  ElementId,
  Point,
  ToolType,
} from "../types"
import {
  calculateBounds,
  createBaseToolState,
  type Tool,
  type ToolContext,
  type ToolState,
} from "./base"

export interface SelectToolOptions {
  multiSelectModifier: "shift" | "ctrl"
}

function getPointsBounds(points: Point[]) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y)
    maxY = Math.max(maxY, p.y)
  }
  return { height: maxY - minY, width: maxX - minX, x: minX, y: minY }
}

// Axis-aligned bounding-box overlap test. The marquee selects any element whose
// bounding box it touches (intersection semantics), so rotation is approximated
// by the element's unrotated box — good enough for a rubber-band selection.
function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  )
}

export function createSelectTool(
  options: SelectToolOptions = { multiSelectModifier: "shift" },
): Tool {
  const state: ToolState = createBaseToolState()
  let dragStartElement: CanvasElement | null = null
  let dragStartPoint: Point | null = null
  const originalPositions = new Map<
    ElementId,
    {
      x: number
      y: number
      width: number
      height: number
      rotation: number
      points?: Point[]
    }
  >()
  let dragHandle: string | null = null
  let rotationCenter: Point | null = null
  let originalBounds: {
    x: number
    y: number
    width: number
    height: number
  } | null = null
  // Marquee (rubber-band) selection: the anchor point where the brush started,
  // the current box while dragging, and the selection captured at brush start so
  // a multi-select modifier can union the brushed elements onto it.
  let brushStart: Point | null = null
  let brushBox: BoundingBox | null = null
  let brushBaseSelection: Set<ElementId> | null = null

  return {
    cursor: "default",
    getSelectionBox() {
      return brushBox
    },
    getTemporaryElement() {
      return null
    },
    isTransforming() {
      return dragHandle !== null
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
      brushStart = null
      brushBox = null
      brushBaseSelection = null
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
          // Empty space: begin a marquee (rubber-band) selection. With the
          // multi-select modifier held, brushed elements are unioned onto the
          // existing selection; otherwise start from an empty selection.
          brushStart = point
          brushBox = { height: 0, width: 0, x: point.x, y: point.y }
          brushBaseSelection = isMultiSelect ? new Set(selectedIds) : new Set()
          if (!isMultiSelect) {
            context.setSelectedIds(new Set())
          }
        }
      }

      const selectedElements = context.getSelectedIds()
      for (const id of selectedElements) {
        const el = elements.get(id)
        if (el) {
          originalPositions.set(id, {
            height: el.height,
            // Paths are rendered from their absolute `points`, so a resize/move
            // must transform the points too. Snapshot them to transform against
            // a stable source instead of the already-mutated live element.
            points:
              el.type === "path"
                ? el.points.map((p) => ({ x: p.x, y: p.y }))
                : undefined,
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

      if (brushStart) {
        // Grow the marquee and reselect every element it now touches, unioned
        // with the selection captured at brush start (empty unless the
        // multi-select modifier was held).
        brushBox = calculateBounds(brushStart, point)
        const next = new Set(brushBaseSelection)
        for (const el of elements.values()) {
          if (el.visible && !el.locked && boxesIntersect(brushBox, el)) {
            next.add(el.id)
          }
        }
        context.setSelectedIds(next)
        return
      }

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

        const [singleId] = selectedIds
        const singleOriginal =
          selectedIds.size === 1 ? originalPositions.get(singleId) : undefined

        if (singleOriginal && singleOriginal.rotation % 360 !== 0) {
          // Rotated element: the handles live in the element's rotated frame, so
          // the resize must be computed there. We un-rotate the pointer into the
          // element's local space, size against the fixed (opposite) corner, and
          // then re-derive the center so that corner stays put in world space.
          const element = elements.get(singleId)
          if (element) {
            const theta = (singleOriginal.rotation * Math.PI) / 180
            const cos = Math.cos(theta)
            const sin = Math.sin(theta)
            const cx = singleOriginal.x + singleOriginal.width / 2
            const cy = singleOriginal.y + singleOriginal.height / 2

            // Pointer in the element's local (unrotated) frame: R(-theta).
            const px = point.x - cx
            const py = point.y - cy
            const localX = cx + px * cos + py * sin
            const localY = cy - px * sin + py * cos

            // Opposite edge stays fixed in local space.
            const anchorX = movesLeft ? bounds.x + bounds.width : bounds.x
            const anchorY = movesTop ? bounds.y + bounds.height : bounds.y

            // Left signed so a handle dragged past the opposite edge yields a
            // negative size, which flips the element across the anchor.
            const newWidth = changesWidth
              ? movesLeft
                ? anchorX - localX
                : localX - anchorX
              : bounds.width
            const newHeight = changesHeight
              ? movesTop
                ? anchorY - localY
                : localY - anchorY
              : bounds.height

            if (element.type === "path" && singleOriginal.points) {
              // Scale the points about the fixed edge in the element's local
              // (unrotated) frame, then translate so the dragged-opposite corner
              // stays put in world space. The rotation pivot is the bbox center,
              // which shifts as the box resizes; t = (I - R(theta)) * (Cold - Cnew)
              // cancels the world-space drift that shift introduces.
              const scaleX = changesWidth ? newWidth / bounds.width : 1
              const scaleY = changesHeight ? newHeight / bounds.height : 1
              const scaled = singleOriginal.points.map((p) => ({
                x: anchorX + (p.x - anchorX) * scaleX,
                y: anchorY + (p.y - anchorY) * scaleY,
              }))
              const nb = getPointsBounds(scaled)

              const ddx = cx - (nb.x + nb.width / 2)
              const ddy = cy - (nb.y + nb.height / 2)
              const tx = ddx - (ddx * cos - ddy * sin)
              const ty = ddy - (ddx * sin + ddy * cos)

              elements.set(singleId, {
                ...element,
                height: nb.height,
                points: scaled.map((p) => ({ x: p.x + tx, y: p.y + ty })),
                width: nb.width,
                x: nb.x + tx,
                y: nb.y + ty,
              })
              context.setElements(new Map(elements))
              return
            }

            // Anchor offset from center, before and after the resize. The
            // anchor is the corner/edge opposite the dragged handle.
            const signX = changesWidth ? (movesLeft ? 1 : -1) : 0
            const signY = changesHeight ? (movesTop ? 1 : -1) : 0
            const origDx = (signX * bounds.width) / 2
            const origDy = (signY * bounds.height) / 2
            const newDx = (signX * newWidth) / 2
            const newDy = (signY * newHeight) / 2

            // World position of the anchor stays fixed: world = C + R(theta)*d.
            // newDx/newDy carry the (possibly negative) sign so the center lands
            // on the correct side when the box flips past the anchor.
            const anchorWorldX = cx + origDx * cos - origDy * sin
            const anchorWorldY = cy + origDx * sin + origDy * cos
            const newCx = anchorWorldX - (newDx * cos - newDy * sin)
            const newCy = anchorWorldY - (newDx * sin + newDy * cos)

            // Store positive dimensions about the same center; a rectangle
            // mirrored about its own center is identical, so abs() is all the
            // flip needs here.
            const absWidth = Math.max(1, Math.abs(newWidth))
            const absHeight = Math.max(1, Math.abs(newHeight))
            elements.set(singleId, {
              ...element,
              height: absHeight,
              width: absWidth,
              x: newCx - absWidth / 2,
              y: newCy - absHeight / 2,
            })
          }
          context.setElements(new Map(elements))
          return
        }

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
              if (element.type === "path" && original.points) {
                // A path renders from its absolute points, so scale those about
                // the same anchor instead of only resizing the bounding box. A
                // negative scale (handle dragged past the anchor) mirrors the
                // points; re-derive the bbox from the result so it stays valid.
                const scaledPoints = original.points.map((p) => ({
                  x: anchorX + (p.x - anchorX) * scaleX,
                  y: anchorY + (p.y - anchorY) * scaleY,
                }))
                const nb = getPointsBounds(scaledPoints)
                elements.set(id, {
                  ...element,
                  height: Math.max(1, nb.height),
                  points: scaledPoints,
                  width: Math.max(1, nb.width),
                  x: nb.x,
                  y: nb.y,
                })
              } else {
                // Scale each element's size and position relative to the fixed
                // anchor so multi-element selections keep their layout.
                let newX = anchorX + (original.x - anchorX) * scaleX
                let newY = anchorY + (original.y - anchorY) * scaleY
                let newElementWidth = original.width * scaleX
                let newElementHeight = original.height * scaleY

                // A handle dragged past the opposite edge produces a negative
                // scale; flip the element across the anchor instead of pinning
                // it to a 1px sliver.
                if (newElementWidth < 0) {
                  newX += newElementWidth
                  newElementWidth = -newElementWidth
                }
                if (newElementHeight < 0) {
                  newY += newElementHeight
                  newElementHeight = -newElementHeight
                }

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
              if (element.type === "path" && original.points) {
                // Paths render from absolute points, so move them alongside the
                // bounding box rather than relying on a separate DOM-layer shift.
                elements.set(id, {
                  ...element,
                  points: original.points.map((p) => ({
                    x: p.x + delta.x,
                    y: p.y + delta.y,
                  })),
                  x: original.x + delta.x,
                  y: original.y + delta.y,
                })
              } else {
                elements.set(id, {
                  ...element,
                  x: original.x + delta.x,
                  y: original.y + delta.y,
                })
              }
            }
          }
        }

        context.setElements(new Map(elements))
      }
    },
    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      // A marquee only changes selection, never geometry, so it must not push a
      // history entry even when it started from a non-empty selection.
      if (!brushStart && originalPositions.size > 0) {
        context.pushHistory()
      }

      state.startPoint = null
      state.currentPoint = null
      dragStartElement = null
      dragStartPoint = null
      dragHandle = null
      rotationCenter = null
      originalBounds = null
      brushStart = null
      brushBox = null
      brushBaseSelection = null
      originalPositions.clear()
    },
    type: "select" as ToolType,
  }
}
