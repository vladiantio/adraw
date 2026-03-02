import {
  type AdrawEvent,
  type AdrawState,
  createStore,
  getPolygonPoints,
  getStarPoints,
  getTransformHandles,
  getVisibleElements,
} from "@adraw/core"
import { createSignal, type JSX, onCleanup, onMount } from "solid-js"

export function createAdraw(initialState: Partial<AdrawState> = {}) {
  const store = createStore(initialState)
  const [state, setState] = createSignal<AdrawState>(store.state)

  const unsubscribe = store.subscribe(setState)
  onCleanup(unsubscribe)

  onMount(() => {
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
        e.preventDefault()
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
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown))
  })

  return {
    state,
    send: store.send,
  }
}

export function AdrawCanvas(props: {
  state: () => AdrawState
  send: (event: AdrawEvent) => void
  class?: string
  style?: JSX.CSSProperties
}) {
  let svgRef: SVGSVGElement | undefined

  const handlePointer =
    (type: "POINTER_DOWN" | "POINTER_MOVE" | "POINTER_UP") =>
    (e: PointerEvent) => {
      if (!svgRef) return
      const rect = svgRef.getBoundingClientRect()
      props.send({
        type,
        point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        event: e,
      })
    }

  const handleWheel = (e: WheelEvent) => {
    if (!svgRef) return
    e.preventDefault()
    const rect = svgRef.getBoundingClientRect()
    props.send({
      type: "WHEEL",
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      ctrlKey: e.ctrlKey,
    })
  }

  return (
    <svg
      ref={svgRef}
      class={props.class}
      role="img"
      aria-label="Infinite Canvas"
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        "touch-action": "none",
        ...props.style,
      }}
      viewBox={`${props.state().viewBox.x} ${props.state().viewBox.y} ${props.state().viewBox.width} ${props.state().viewBox.height}`}
      onPointerDown={handlePointer("POINTER_DOWN")}
      onPointerMove={handlePointer("POINTER_MOVE")}
      onPointerUp={handlePointer("POINTER_UP")}
      onWheel={handleWheel}
    >
      <title>Infinite Canvas</title>
      <rect
        x={props.state().viewBox.x}
        y={props.state().viewBox.y}
        width={props.state().viewBox.width}
        height={props.state().viewBox.height}
        fill="#fafafa"
      />
      {getVisibleElements(props.state()).map((el) => {
        const isSelected = props.state().selectedElementIds.includes(el.id)
        const baseProps = {
          stroke: el.stroke,
          fill: el.fill,
          "stroke-width": el.strokeWidth,
          "stroke-dasharray": isSelected ? "5,5" : undefined,
          transform: `rotate(${(el.rotation * 180) / Math.PI}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`,
        }

        return (
          <g>
            {el.type === "rectangle" && (
              <rect
                {...baseProps}
                x={Math.min(el.x, el.x + el.width)}
                y={Math.min(el.y, el.y + el.height)}
                width={Math.abs(el.width)}
                height={Math.abs(el.height)}
              />
            )}
            {el.type === "ellipse" && (
              <ellipse
                {...baseProps}
                cx={el.x + el.width / 2}
                cy={el.y + el.height / 2}
                rx={Math.abs(el.width) / 2}
                ry={Math.abs(el.height) / 2}
              />
            )}
            {el.type === "star" && (
              <polygon
                {...baseProps}
                points={getStarPoints(
                  el.x,
                  el.y,
                  el.width,
                  el.height,
                  el.points,
                  el.innerRadius,
                )}
              />
            )}
            {el.type === "polygon" && (
              <polygon
                {...baseProps}
                points={getPolygonPoints(
                  el.x,
                  el.y,
                  el.width,
                  el.height,
                  el.sides,
                )}
              />
            )}
            {el.type === "draw" && (
              <path
                {...baseProps}
                d={el.points
                  .map(
                    (p, i) =>
                      `${i === 0 ? "M" : "L"} ${el.x + p.x} ${el.y + p.y}`,
                  )
                  .join(" ")}
                fill="none"
              />
            )}
            {el.type === "image" && (
              <image
                href={el.url}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                opacity={el.opacity}
                transform={baseProps.transform}
              />
            )}
            {isSelected &&
              getTransformHandles(el).map((handle) => (
                <rect
                  x={handle.x}
                  y={handle.y}
                  width={handle.width}
                  height={handle.height}
                  fill="white"
                  stroke="blue"
                  stroke-width="1"
                />
              ))}
          </g>
        )
      })}
    </svg>
  )
}
