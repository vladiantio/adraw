import type { Point, Size, ViewportState } from "./types"

export function screenToCanvas(
  screenPoint: Point,
  viewport: ViewportState,
  canvasSize: Size,
): Point {
  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2

  const x = (screenPoint.x - centerX) / viewport.zoom + viewport.x
  const y = (screenPoint.y - centerY) / viewport.zoom + viewport.y

  return { x, y }
}

export function canvasToScreen(
  canvasPoint: Point,
  viewport: ViewportState,
  canvasSize: Size,
): Point {
  const centerX = canvasSize.width / 2
  const centerY = canvasSize.height / 2

  const x = (canvasPoint.x - viewport.x) * viewport.zoom + centerX
  const y = (canvasPoint.y - viewport.y) * viewport.zoom + centerY

  return { x, y }
}

export function getElementBounds(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number = 0,
): { left: number; right: number; top: number; bottom: number; center: Point } {
  if (rotation === 0) {
    return {
      left: x,
      right: x + width,
      top: y,
      bottom: y + height,
      center: { x: x + width / 2, y: y + height / 2 },
    }
  }

  const cx = x + width / 2
  const cy = y + height / 2
  const rad = (rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const corners = [
    { x: x - width / 2, y: y - height / 2 },
    { x: x + width / 2, y: y - height / 2 },
    { x: x + width / 2, y: y + height / 2 },
    { x: x - width / 2, y: y + height / 2 },
  ]

  const rotatedCorners = corners.map((corner) => ({
    x: cos * (corner.x - cx) - sin * (corner.y - cy) + cx,
    y: sin * (corner.x - cx) + cos * (corner.y - cy) + cy,
  }))

  const xs = rotatedCorners.map((c) => c.x)
  const ys = rotatedCorners.map((c) => c.y)

  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
    center: { x: cx, y: cy },
  }
}

export function pointInBounds(
  point: Point,
  bounds: { left: number; right: number; top: number; bottom: number },
): boolean {
  return (
    point.x >= bounds.left &&
    point.x <= bounds.right &&
    point.y >= bounds.top &&
    point.y <= bounds.bottom
  )
}

export function distanceBetweenPoints(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}
