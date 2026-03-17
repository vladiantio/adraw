import { createPath } from "../elements"
import type { PathElement, Point, ToolType } from "../types"
import type { Tool, ToolContext, ToolOptions, ToolState } from "./base"
import { createBaseToolState, getDefaultToolOptions } from "./base"

export interface DrawToolOptions extends ToolOptions {
  smoothing?: number
}

export function createDrawTool(options: DrawToolOptions = {}): Tool {
  const state: ToolState = createBaseToolState()
  const toolOptions = { ...getDefaultToolOptions(), ...options }
  const smoothing = options.smoothing ?? 0.5
  let currentPoints: Point[] = []
  let temporaryElement: PathElement | null = null

  function simplifyPath(points: Point[], tolerance: number): Point[] {
    if (points.length <= 2) {
      return points
    }

    const first = points[0]
    const last = points[points.length - 1]

    let maxDistance = 0
    let maxIndex = 0

    for (let i = 1; i < points.length - 1; i++) {
      const distance = perpendicularDistance(points[i], first, last)
      if (distance > maxDistance) {
        maxDistance = distance
        maxIndex = i
      }
    }

    if (maxDistance > tolerance) {
      const left = simplifyPath(points.slice(0, maxIndex + 1), tolerance)
      const right = simplifyPath(points.slice(maxIndex), tolerance)
      return [...left.slice(0, -1), ...right]
    }

    return [first, last]
  }

  function perpendicularDistance(
    point: Point,
    lineStart: Point,
    lineEnd: Point,
  ): number {
    const dx = lineEnd.x - lineStart.x
    const dy = lineEnd.y - lineStart.y

    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        (point.x - lineStart.x) ** 2 + (point.y - lineStart.y) ** 2,
      )
    }

    const t =
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
      (dx * dx + dy * dy)

    const nearestX = lineStart.x + t * dx
    const nearestY = lineStart.y + t * dy

    return Math.sqrt((point.x - nearestX) ** 2 + (point.y - nearestY) ** 2)
  }

  function getPathBounds(points: Point[]): {
    x: number
    y: number
    width: number
    height: number
  } | null {
    if (points.length === 0) {
      return null
    }

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const point of points) {
      minX = Math.min(minX, point.x)
      maxX = Math.max(maxX, point.x)
      minY = Math.min(minY, point.y)
      maxY = Math.max(maxY, point.y)
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  return {
    type: "draw" as ToolType,
    cursor: "crosshair",

    onActivate() {
      state.isActive = true
    },

    onDeactivate() {
      state.isActive = false
      state.startPoint = null
      state.currentPoint = null
      currentPoints = []
      temporaryElement = null
    },

    onPointerDown(_context: ToolContext, point: Point, _event: PointerEvent) {
      state.startPoint = point
      state.currentPoint = point
      currentPoints = [point]
    },

    onPointerMove(_context: ToolContext, point: Point, _event: PointerEvent) {
      if (!state.startPoint) {
        return
      }

      state.currentPoint = point
      currentPoints.push(point)

      const simplifiedPoints = simplifyPath(currentPoints, 1 - smoothing)
      const bounds = getPathBounds(simplifiedPoints)

      if (bounds) {
        temporaryElement = createPath({
          x: bounds.x,
          y: bounds.y,
          width: Math.max(bounds.width, 1),
          height: Math.max(bounds.height, 1),
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          points: simplifiedPoints,
          strokeWidth: toolOptions.strokeWidth ?? 2,
          strokeColor: toolOptions.strokeColor ?? "#000000",
          fillColor: toolOptions.fillColor ?? "transparent",
        })
      }
    },

    onPointerUp(context: ToolContext, _point: Point, _event: PointerEvent) {
      if (currentPoints.length < 2) {
        state.startPoint = null
        state.currentPoint = null
        currentPoints = []
        temporaryElement = null
        return
      }

      const simplifiedPoints = simplifyPath(currentPoints, 1 - smoothing)
      const bounds = getPathBounds(simplifiedPoints)

      if (bounds) {
        const element = createPath({
          x: bounds.x,
          y: bounds.y,
          width: Math.max(bounds.width, 1),
          height: Math.max(bounds.height, 1),
          rotation: 0,
          zIndex: context.getElements().size,
          locked: false,
          visible: true,
          points: simplifiedPoints,
          strokeWidth: toolOptions.strokeWidth ?? 2,
          strokeColor: toolOptions.strokeColor ?? "#000000",
          fillColor: toolOptions.fillColor ?? "transparent",
        })

        const elements = context.getElements()
        elements.set(element.id, element)
        context.setElements(elements)
        context.setSelectedIds(new Set([element.id]))
        context.pushHistory()
      }

      state.startPoint = null
      state.currentPoint = null
      currentPoints = []
      temporaryElement = null
    },

    getTemporaryElement() {
      return temporaryElement
    },
  }
}
