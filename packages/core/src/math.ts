import type { AdrawElement, Box, HandleType, Point } from "./types"

export function getElementBounds(el: AdrawElement): Box {
  if (el.type === "draw") {
    const points = el.points
    if (points.length === 0) return { x: el.x, y: el.y, width: 0, height: 0 }
    let minX = points[0].x
    let maxX = points[0].x
    let minY = points[0].y
    let maxY = points[0].y
    for (const p of points) {
      minX = Math.min(minX, p.x)
      maxX = Math.max(maxX, p.x)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y)
    }
    return {
      x: el.x + minX,
      y: el.y + minY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }
  return {
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
  }
}

export function isPointInBox(p: Point, box: Box): boolean {
  return (
    p.x >= box.x &&
    p.x <= box.x + box.width &&
    p.y >= box.y &&
    p.y <= box.y + box.height
  )
}

export function intersectBoxes(a: Box, b: Box): boolean {
  return !(
    a.x > b.x + b.width ||
    a.x + a.width < b.x ||
    a.y > b.y + b.height ||
    a.y + a.height < b.y
  )
}

export function snapPoint(
  p: Point,
  elements: AdrawElement[],
  threshold = 10,
): Point {
  const snapped = { ...p }
  let minDistX = threshold
  let minDistY = threshold

  for (const el of elements) {
    const bounds = getElementBounds(el)
    const targetsX = [bounds.x, bounds.x + bounds.width]
    const targetsY = [bounds.y, bounds.y + bounds.height]

    for (const tx of targetsX) {
      const d = Math.abs(p.x - tx)
      if (d < minDistX) {
        minDistX = d
        snapped.x = tx
      }
    }
    for (const ty of targetsY) {
      const d = Math.abs(p.y - ty)
      if (d < minDistY) {
        minDistY = d
        snapped.y = ty
      }
    }
  }
  return snapped
}

export function getStarPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  points: number,
  innerRadiusFactor: number,
): string {
  const rx = Math.abs(width) / 2
  const ry = Math.abs(height) / 2
  const cx = x + width / 2
  const cy = y + height / 2
  const angleStep = Math.PI / points
  const result: Point[] = []

  for (let i = 0; i < 2 * points; i++) {
    const radiusX = i % 2 === 0 ? rx : rx * innerRadiusFactor
    const radiusY = i % 2 === 0 ? ry : ry * innerRadiusFactor
    const angle = i * angleStep - Math.PI / 2
    result.push({
      x: cx + radiusX * Math.cos(angle),
      y: cy + radiusY * Math.sin(angle),
    })
  }
  return result.map((p) => `${p.x},${p.y}`).join(" ")
}

export function getPolygonPoints(
  x: number,
  y: number,
  width: number,
  height: number,
  sides: number,
): string {
  const rx = Math.abs(width) / 2
  const ry = Math.abs(height) / 2
  const cx = x + width / 2
  const cy = y + height / 2
  const angleStep = (2 * Math.PI) / sides
  const result: Point[] = []

  for (let i = 0; i < sides; i++) {
    const angle = i * angleStep - Math.PI / 2
    result.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    })
  }
  return result.map((p) => `${p.x},${p.y}`).join(" ")
}

export type Handle = { type: HandleType } & Box

export function getTransformHandles(el: AdrawElement): Handle[] {
  const bounds = getElementBounds(el)
  const size = 10
  return [
    {
      type: "nw",
      x: bounds.x - size / 2,
      y: bounds.y - size / 2,
      width: size,
      height: size,
    },
    {
      type: "ne",
      x: bounds.x + bounds.width - size / 2,
      y: bounds.y - size / 2,
      width: size,
      height: size,
    },
    {
      type: "sw",
      x: bounds.x - size / 2,
      y: bounds.y + bounds.height - size / 2,
      width: size,
      height: size,
    },
    {
      type: "se",
      x: bounds.x + bounds.width - size / 2,
      y: bounds.y + bounds.height - size / 2,
      width: size,
      height: size,
    },
    {
      type: "rotation",
      x: bounds.x + bounds.width / 2 - size / 2,
      y: bounds.y - 30,
      width: size,
      height: size,
    },
  ]
}
