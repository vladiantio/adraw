import { generateId } from "./coordinates.js"
import type {
  CanvasElement,
  ElementId,
  EllipseElement,
  GroupElement,
  MediaElement,
  PathElement,
  Point,
  RectangleElement,
  StarElement,
} from "./types.js"

export type ElementFactory<T extends CanvasElement> = Omit<T, "id" | "type"> & {
  id?: string
}

export function createRectangle(
  factory: ElementFactory<RectangleElement>,
): RectangleElement {
  return {
    ...factory,
    id: factory.id ?? generateId(),
    type: "rectangle",
  }
}

export function createEllipse(
  factory: ElementFactory<EllipseElement>,
): EllipseElement {
  return {
    ...factory,
    id: factory.id ?? generateId(),
    type: "ellipse",
  }
}

export function createStar(factory: ElementFactory<StarElement>): StarElement {
  return {
    ...factory,
    id: factory.id ?? generateId(),
    type: "star",
  }
}

export function createPath(factory: ElementFactory<PathElement>): PathElement {
  return {
    ...factory,
    id: factory.id ?? generateId(),
    type: "path",
    points: factory.points ?? [],
  }
}

export function createMedia(
  factory: ElementFactory<MediaElement>,
): MediaElement {
  return {
    ...factory,
    id: factory.id ?? generateId(),
    type: "media",
  }
}

export function createGroup(
  factory: ElementFactory<GroupElement>,
): GroupElement {
  return {
    ...factory,
    id: factory.id ?? generateId(),
    type: "group",
    children: factory.children ?? [],
  }
}

export function cloneElement<T extends CanvasElement>(
  element: T,
  offset: Point = { x: 20, y: 20 },
): T {
  return {
    ...element,
    id: generateId(),
    x: element.x + offset.x,
    y: element.y + offset.y,
  }
}

export function moveElement(
  element: CanvasElement,
  delta: Point,
): CanvasElement {
  return {
    ...element,
    x: element.x + delta.x,
    y: element.y + delta.y,
  }
}

export function resizeElement(
  element: CanvasElement,
  width: number,
  height: number,
  anchor:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | "center" = "top-left",
): CanvasElement {
  let x = element.x
  let y = element.y

  switch (anchor) {
    case "top-right":
      x = element.x + element.width - width
      break
    case "bottom-left":
      y = element.y + element.height - height
      break
    case "bottom-right":
      x = element.x + element.width - width
      y = element.y + element.height - height
      break
    case "center":
      x = element.x + (element.width - width) / 2
      y = element.y + (element.height - height) / 2
      break
  }

  return {
    ...element,
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height),
  }
}

export function rotateElement(
  element: CanvasElement,
  rotation: number,
): CanvasElement {
  return {
    ...element,
    rotation: rotation % 360,
  }
}

export function getElementsBounds(
  elements: Map<ElementId, CanvasElement>,
): { left: number; right: number; top: number; bottom: number } | null {
  const elementArray = Array.from(elements.values()).filter((el) => el.visible)

  if (elementArray.length === 0) {
    return null
  }

  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity

  for (const element of elementArray) {
    left = Math.min(left, element.x)
    right = Math.max(right, element.x + element.width)
    top = Math.min(top, element.y)
    bottom = Math.max(bottom, element.y + element.height)
  }

  return { left, right, top, bottom }
}

export function getElementAtPoint(
  elements: Map<ElementId, CanvasElement>,
  point: Point,
): CanvasElement | null {
  const elementArray = Array.from(elements.values())
    .filter((el) => el.visible && !el.locked)
    .sort((a, b) => b.zIndex - a.zIndex)

  for (const element of elementArray) {
    if (isPointInElement(point, element)) {
      return element
    }
  }

  return null
}

function isPointInElement(point: Point, element: CanvasElement): boolean {
  const { x, y, width, height, rotation } = element

  if (rotation === 0) {
    return (
      point.x >= x &&
      point.x <= x + width &&
      point.y >= y &&
      point.y <= y + height
    )
  }

  const cx = x + width / 2
  const cy = y + height / 2
  const rad = (-rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)

  const dx = point.x - cx
  const dy = point.y - cy

  const rx = cos * dx - sin * dy
  const ry = sin * dx + cos * dy

  return (
    rx >= -width / 2 && rx <= width / 2 && ry >= -height / 2 && ry <= height / 2
  )
}
