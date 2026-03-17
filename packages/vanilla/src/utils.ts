import type { CanvasElement, Point } from "@adraw/core"

export function pointsToPath(points: Point[], x: number, y: number): string {
  if (points.length === 0) return ""

  let d = `M ${points[0].x - x} ${points[0].y - y}`

  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x - x} ${points[i].y - y}`
  }

  return d
}

export function createElementGroup(element: CanvasElement): SVGGElement {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g")
  group.setAttribute("data-id", element.id)
  group.setAttribute(
    "transform",
    `translate(${element.x}, ${element.y}) rotate(${element.rotation}, ${element.width / 2}, ${element.height / 2})`,
  )

  switch (element.type) {
    case "rectangle": {
      const rect = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "rect",
      )
      rect.setAttribute("width", String(element.width))
      rect.setAttribute("height", String(element.height))
      rect.setAttribute("rx", String(element.cornerRadius))
      rect.setAttribute("fill", "var(--adraw-fill-color, #ffffff)")
      rect.setAttribute("stroke", "var(--adraw-stroke-color, #000000)")
      rect.setAttribute("stroke-width", "2")
      group.appendChild(rect)
      break
    }

    case "ellipse": {
      const ellipse = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "ellipse",
      )
      ellipse.setAttribute("cx", String(element.width / 2))
      ellipse.setAttribute("cy", String(element.height / 2))
      ellipse.setAttribute("rx", String(element.width / 2))
      ellipse.setAttribute("ry", String(element.height / 2))
      ellipse.setAttribute("fill", "var(--adraw-fill-color, #ffffff)")
      ellipse.setAttribute("stroke", "var(--adraw-stroke-color, #000000)")
      ellipse.setAttribute("stroke-width", "2")
      group.appendChild(ellipse)
      break
    }

    case "path": {
      const pathData = pointsToPath(element.points, element.x, element.y)
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      )
      path.setAttribute("d", pathData)
      path.setAttribute("fill", element.fillColor || "none")
      path.setAttribute("stroke", element.strokeColor || "#000000")
      path.setAttribute("stroke-width", String(element.strokeWidth || 2))
      group.appendChild(path)
      break
    }

    case "media": {
      const image = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "image",
      )
      image.setAttribute("href", element.src)
      image.setAttribute("width", String(element.width))
      image.setAttribute("height", String(element.height))
      image.setAttribute("preserveAspectRatio", "none")
      group.appendChild(image)
      break
    }
  }

  return group
}
