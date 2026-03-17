import type {
  CanvasElement,
  ElementId,
  Point,
  SnapGuide,
  SnapResult,
} from "./types"

export interface SnappingConfig {
  enabled: boolean
  threshold: number
}

const DEFAULT_SNAPPING_CONFIG: SnappingConfig = {
  enabled: false,
  threshold: 5,
}

export function createSnappingConfig(
  partial: Partial<SnappingConfig> = {},
): SnappingConfig {
  return {
    ...DEFAULT_SNAPPING_CONFIG,
    ...partial,
  }
}

export interface SnapPoint {
  x: number
  y: number
  elementId: ElementId
  type: "left" | "right" | "top" | "bottom" | "center-x" | "center-y"
}

export function getElementSnapPoints(element: CanvasElement): SnapPoint[] {
  const { x, y, width, height } = element
  const cx = x + width / 2
  const cy = y + height / 2

  return [
    { x, y, elementId: element.id, type: "left" },
    { x: x + width, y, elementId: element.id, type: "right" },
    { x, y, elementId: element.id, type: "top" },
    { x, y: y + height, elementId: element.id, type: "bottom" },
    { x: cx, y, elementId: element.id, type: "center-y" },
    { x, y: cy, elementId: element.id, type: "center-x" },
  ]
}

export function getAllSnapPoints(
  elements: Map<ElementId, CanvasElement>,
  excludeIds: Set<ElementId> = new Set(),
): SnapPoint[] {
  const snapPoints: SnapPoint[] = []

  for (const [id, element] of elements) {
    if (excludeIds.has(id) || !element.visible || element.locked) {
      continue
    }
    snapPoints.push(...getElementSnapPoints(element))
  }

  return snapPoints
}

export function calculateSnap(
  point: Point,
  snapPoints: SnapPoint[],
  threshold: number,
): SnapResult {
  const guides: SnapGuide[] = []
  let snapped = false

  for (const snapPoint of snapPoints) {
    const dx = Math.abs(point.x - snapPoint.x)
    const dy = Math.abs(point.y - snapPoint.y)

    if (dx < threshold) {
      guides.push({
        type: "vertical",
        position: snapPoint.x,
        elements: [snapPoint.elementId],
      })
      snapped = true
    }

    if (dy < threshold) {
      guides.push({
        type: "horizontal",
        position: snapPoint.y,
        elements: [snapPoint.elementId],
      })
      snapped = true
    }
  }

  return { guides, snapped }
}

export function snapPointToGuides(point: Point, guides: SnapGuide[]): Point {
  let snappedX = point.x
  let snappedY = point.y

  for (const guide of guides) {
    if (guide.type === "vertical") {
      snappedX = guide.position
    } else if (guide.type === "horizontal") {
      snappedY = guide.position
    }
  }

  return { x: snappedX, y: snappedY }
}

export function snapBoundsToElements(
  bounds: { x: number; y: number; width: number; height: number },
  elements: Map<ElementId, CanvasElement>,
  excludeIds: Set<ElementId>,
  threshold: number,
): {
  x: number
  y: number
  width: number
  height: number
  guides: SnapGuide[]
} {
  const snapPoints = getAllSnapPoints(elements, excludeIds)
  const guides: SnapGuide[] = []

  const leftPoints = snapPoints.filter((p) => p.type === "left")
  const rightPoints = snapPoints.filter((p) => p.type === "right")
  const topPoints = snapPoints.filter((p) => p.type === "top")
  const bottomPoints = snapPoints.filter((p) => p.type === "bottom")

  let newX = bounds.x
  let newY = bounds.y

  for (const point of leftPoints) {
    if (Math.abs(bounds.x - point.x) < threshold) {
      newX = point.x
      guides.push({
        type: "vertical",
        position: point.x,
        elements: [point.elementId],
      })
      break
    }
  }

  for (const point of rightPoints) {
    if (Math.abs(bounds.x + bounds.width - point.x) < threshold) {
      newX = point.x - bounds.width
      guides.push({
        type: "vertical",
        position: point.x,
        elements: [point.elementId],
      })
      break
    }
  }

  for (const point of topPoints) {
    if (Math.abs(bounds.y - point.y) < threshold) {
      newY = point.y
      guides.push({
        type: "horizontal",
        position: point.y,
        elements: [point.elementId],
      })
      break
    }
  }

  for (const point of bottomPoints) {
    if (Math.abs(bounds.y + bounds.height - point.y) < threshold) {
      newY = point.y - bounds.height
      guides.push({
        type: "horizontal",
        position: point.y,
        elements: [point.elementId],
      })
      break
    }
  }

  return {
    x: newX,
    y: newY,
    width: bounds.width,
    height: bounds.height,
    guides,
  }
}
