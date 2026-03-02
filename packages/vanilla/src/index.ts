import {
  type AdrawState,
  createStore,
  getPolygonPoints,
  getStarPoints,
  getTransformHandles,
  getVisibleElements,
} from "@adraw/core"

export function createAdrawCanvas(container: HTMLElement) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.setAttribute("width", "100%")
  svg.setAttribute("height", "100%")
  svg.setAttribute("role", "img")
  svg.setAttribute("aria-label", "Infinite Canvas")
  svg.setAttribute(
    "style",
    "display: block; width: 100%; height: 100%; touch-action: none;",
  )
  container.appendChild(svg)

  const title = document.createElementNS("http://www.w3.org/2000/svg", "title")
  title.textContent = "Infinite Canvas"
  svg.appendChild(title)

  const store = createStore()

  const render = (state: AdrawState) => {
    // Keep the first children (title and potentially other static defs)
    while (svg.childNodes.length > 1) {
      svg.removeChild(svg.lastChild!)
    }

    svg.setAttribute(
      "viewBox",
      `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.width} ${state.viewBox.height}`,
    )

    // Grid pattern
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs")
    const pattern = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "pattern",
    )
    pattern.setAttribute("id", "grid-vanilla")
    pattern.setAttribute("width", "100")
    pattern.setAttribute("height", "100")
    pattern.setAttribute("patternUnits", "userSpaceOnUse")
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path")
    path.setAttribute("d", "M 100 0 L 0 0 0 100")
    path.setAttribute("fill", "none")
    path.setAttribute("stroke", "rgba(0,0,0,0.1)")
    path.setAttribute("stroke-width", "0.5")
    pattern.appendChild(path)
    defs.appendChild(pattern)
    svg.appendChild(defs)

    const gridRect = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "rect",
    )
    gridRect.setAttribute("x", state.viewBox.x.toString())
    gridRect.setAttribute("y", state.viewBox.y.toString())
    gridRect.setAttribute("width", state.viewBox.width.toString())
    gridRect.setAttribute("height", state.viewBox.height.toString())
    gridRect.setAttribute("fill", "url(#grid-vanilla)")
    svg.appendChild(gridRect)

    const visibleElements = getVisibleElements(state)

    // Elements
    for (const el of visibleElements) {
      const isSelected = state.selectedElementIds.includes(el.id)
      const g = document.createElementNS("http://www.w3.org/2000/svg", "g")
      const rotationDeg = (el.rotation * 180) / Math.PI
      const cx = el.x + el.width / 2
      const cy = el.y + el.height / 2
      g.setAttribute("transform", `rotate(${rotationDeg}, ${cx}, ${cy})`)

      let elNode: SVGElement | null = null
      if (el.type === "rectangle") {
        elNode = document.createElementNS("http://www.w3.org/2000/svg", "rect")
        elNode.setAttribute("x", Math.min(el.x, el.x + el.width).toString())
        elNode.setAttribute("y", Math.min(el.y, el.y + el.height).toString())
        elNode.setAttribute("width", Math.abs(el.width).toString())
        elNode.setAttribute("height", Math.abs(el.height).toString())
      } else if (el.type === "ellipse") {
        elNode = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "ellipse",
        )
        elNode.setAttribute("cx", (el.x + el.width / 2).toString())
        elNode.setAttribute("cy", (el.y + el.height / 2).toString())
        elNode.setAttribute("rx", (Math.abs(el.width) / 2).toString())
        elNode.setAttribute("ry", (Math.abs(el.height) / 2).toString())
      } else if (el.type === "star") {
        elNode = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        )
        elNode.setAttribute(
          "points",
          getStarPoints(
            el.x,
            el.y,
            el.width,
            el.height,
            el.points,
            el.innerRadius,
          ),
        )
      } else if (el.type === "polygon") {
        elNode = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "polygon",
        )
        elNode.setAttribute(
          "points",
          getPolygonPoints(el.x, el.y, el.width, el.height, el.sides),
        )
      } else if (el.type === "draw") {
        elNode = document.createElementNS("http://www.w3.org/2000/svg", "path")
        const d = el.points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${el.x + p.x} ${el.y + p.y}`)
          .join(" ")
        elNode.setAttribute("d", d)
        elNode.setAttribute("fill", "none")
      } else if (el.type === "image") {
        elNode = document.createElementNS("http://www.w3.org/2000/svg", "image")
        elNode.setAttribute("href", el.url)
        elNode.setAttribute("x", el.x.toString())
        elNode.setAttribute("y", el.y.toString())
        elNode.setAttribute("width", el.width.toString())
        elNode.setAttribute("height", el.height.toString())
        elNode.setAttribute("opacity", el.opacity.toString())
      }

      if (elNode) {
        elNode.setAttribute("stroke", el.stroke)
        elNode.setAttribute("fill", el.fill)
        elNode.setAttribute("stroke-width", el.strokeWidth.toString())
        if (isSelected) elNode.setAttribute("stroke-dasharray", "5,5")
        g.appendChild(elNode)
      }

      if (isSelected) {
        const handles = getTransformHandles(el)
        for (const handle of handles) {
          const hNode = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "rect",
          )
          hNode.setAttribute("x", handle.x.toString())
          hNode.setAttribute("y", handle.y.toString())
          hNode.setAttribute("width", handle.width.toString())
          hNode.setAttribute("height", handle.height.toString())
          hNode.setAttribute("fill", "white")
          hNode.setAttribute("stroke", "blue")
          hNode.setAttribute("stroke-width", "1")
          g.appendChild(hNode)
        }
      }
      svg.appendChild(g)
    }
  }

  const unsubscribe = store.subscribe(render)

  const handlePointer =
    (type: "POINTER_DOWN" | "POINTER_MOVE" | "POINTER_UP") =>
    (e: PointerEvent) => {
      const rect = svg.getBoundingClientRect()
      store.send({
        type,
        point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        event: e,
      })
    }

  const onPointerDown = handlePointer("POINTER_DOWN")
  const onPointerMove = (e: PointerEvent) => handlePointer("POINTER_MOVE")(e)
  const onPointerUp = (e: PointerEvent) => handlePointer("POINTER_UP")(e)

  svg.addEventListener("pointerdown", onPointerDown)
  window.addEventListener("pointermove", onPointerMove)
  window.addEventListener("pointerup", onPointerUp)

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    const rect = svg.getBoundingClientRect()
    store.send({
      type: "WHEEL",
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      ctrlKey: e.ctrlKey,
    })
  }

  svg.addEventListener("wheel", onWheel, { passive: false })

  const handleKeyDown = (e: KeyboardEvent) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
    const cmdCtrl = isMac ? e.metaKey : e.ctrlKey

    if (cmdCtrl && e.key.toLowerCase() === "u") {
      e.preventDefault()
      const url = prompt("Enter image/SVG URL:")
      if (url) {
        store.send({
          type: "ADD_IMAGE",
          url,
          point: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        })
      }
    }

    if (cmdCtrl && e.key.toLowerCase() === "z") {
      if (e.shiftKey) store.send({ type: "REDO" })
      else store.send({ type: "UNDO" })
    }

    switch (e.key.toLowerCase()) {
      case "v":
        store.send({ type: "SET_TOOL", tool: "select" })
        break
      case "h":
        store.send({ type: "SET_TOOL", tool: "hand" })
        break
      case "d":
        store.send({ type: "SET_TOOL", tool: "draw" })
        break
      case "e":
        store.send({ type: "SET_TOOL", tool: "erase" })
        break
      case "r":
        store.send({ type: "SET_TOOL", tool: "rectangle" })
        break
      case "delete":
      case "backspace":
        store.send({ type: "DELETE_SELECTED" })
        break
    }
  }

  window.addEventListener("keydown", handleKeyDown)

  render(store.state)

  return {
    store,
    svg,
    destroy: () => {
      unsubscribe()
      svg.removeEventListener("pointerdown", onPointerDown)
      window.removeEventListener("pointermove", onPointerMove)
      window.removeEventListener("pointerup", onPointerUp)
      svg.removeEventListener("wheel", onWheel)
      window.removeEventListener("keydown", handleKeyDown)
      if (svg.parentNode) svg.parentNode.removeChild(svg)
    },
  }
}

export * from "@adraw/core"
