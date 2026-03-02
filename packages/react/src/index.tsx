import {
  type AdrawEvent,
  type AdrawState,
  createStore,
  getPolygonPoints,
  getStarPoints,
  getTransformHandles,
  getVisibleElements,
} from "@adraw/core"
import { useEffect, useRef, useState } from "react"

export function useAdraw(initialState: Partial<AdrawState> = {}) {
  const storeRef = useRef<ReturnType<typeof createStore>>(null)
  const [state, setState] = useState<AdrawState>(null as any)

  if (!storeRef.current) {
    storeRef.current = createStore(initialState)
  }

  useEffect(() => {
    setState(storeRef.current?.state)
    const sub = storeRef.current?.subscribe(setState)

    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const cmdCtrl = isMac ? e.metaKey : e.ctrlKey

      if (cmdCtrl && e.key.toLowerCase() === "u") {
        e.preventDefault()
        const url = prompt("Enter image/SVG URL:")
        if (url) {
          storeRef.current?.send({
            type: "ADD_IMAGE",
            url,
            point: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
          })
        }
      }

      if (cmdCtrl && e.key.toLowerCase() === "z") {
        e.preventDefault()
        if (e.shiftKey) storeRef.current?.send({ type: "REDO" })
        else storeRef.current?.send({ type: "UNDO" })
      }

      switch (e.key.toLowerCase()) {
        case "v":
          storeRef.current?.send({ type: "SET_TOOL", tool: "select" })
          break
        case "h":
          storeRef.current?.send({ type: "SET_TOOL", tool: "hand" })
          break
        case "d":
          storeRef.current?.send({ type: "SET_TOOL", tool: "draw" })
          break
        case "e":
          storeRef.current?.send({ type: "SET_TOOL", tool: "erase" })
          break
        case "r":
          storeRef.current?.send({ type: "SET_TOOL", tool: "rectangle" })
          break
        case "delete":
        case "backspace":
          storeRef.current?.send({ type: "DELETE_SELECTED" })
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      sub()
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  return {
    state,
    send: storeRef.current?.send,
  }
}

export function AdrawCanvas({
  state,
  send,
  className,
  style,
}: {
  state: AdrawState
  send: (event: AdrawEvent) => void
  className?: string
  style?: React.CSSProperties
}) {
  const svgRef = useRef<SVGSVGElement>(null)

  if (!state) return null

  const handlePointer =
    (type: "POINTER_DOWN" | "POINTER_MOVE" | "POINTER_UP") =>
    (e: React.PointerEvent) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      send({
        type,
        point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        event: e.nativeEvent,
      })
    }

  const handleWheel = (e: React.WheelEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    send({
      type: "WHEEL",
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
      ctrlKey: e.ctrlKey,
    })
  }

  const visibleElements = getVisibleElements(state)

  return (
    <svg
      ref={svgRef}
      role="img"
      aria-label="Infinite Canvas"
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        touchAction: "none",
        ...style,
      }}
      viewBox={`${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.width} ${state.viewBox.height}`}
      onPointerDown={handlePointer("POINTER_DOWN")}
      onPointerMove={handlePointer("POINTER_MOVE")}
      onPointerUp={handlePointer("POINTER_UP")}
      onWheel={handleWheel}
    >
      <title>Infinite Canvas</title>
      <defs>
        <pattern
          id="grid"
          width="100"
          height="100"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 100 0 L 0 0 0 100"
            fill="none"
            stroke="gray"
            strokeWidth="0.5"
          />
        </pattern>
      </defs>
      <rect
        x={state.viewBox.x}
        y={state.viewBox.y}
        width={state.viewBox.width}
        height={state.viewBox.height}
        fill="url(#grid)"
      />
      {visibleElements.map((el) => {
        const isSelected = state.selectedElementIds.includes(el.id)
        const commonProps = {
          stroke: el.stroke,
          fill: el.fill,
          strokeWidth: el.strokeWidth,
          strokeDasharray: isSelected ? "5,5" : undefined,
          transform: `rotate(${(el.rotation * 180) / Math.PI}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`,
        }

        let elementNode = null

        if (el.type === "rectangle") {
          elementNode = (
            <rect
              {...commonProps}
              x={Math.min(el.x, el.x + el.width)}
              y={Math.min(el.y, el.y + el.height)}
              width={Math.abs(el.width)}
              height={Math.abs(el.height)}
            />
          )
        } else if (el.type === "ellipse") {
          elementNode = (
            <ellipse
              {...commonProps}
              cx={el.x + el.width / 2}
              cy={el.y + el.height / 2}
              rx={Math.abs(el.width) / 2}
              ry={Math.abs(el.height) / 2}
            />
          )
        } else if (el.type === "star") {
          elementNode = (
            <polygon
              {...commonProps}
              points={getStarPoints(
                el.x,
                el.y,
                el.width,
                el.height,
                el.points,
                el.innerRadius,
              )}
            />
          )
        } else if (el.type === "polygon") {
          elementNode = (
            <polygon
              {...commonProps}
              points={getPolygonPoints(
                el.x,
                el.y,
                el.width,
                el.height,
                el.sides,
              )}
            />
          )
        } else if (el.type === "draw") {
          const d = el.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${el.x + p.x} ${el.y + p.y}`)
            .join(" ")
          elementNode = <path {...commonProps} d={d} fill="none" />
        } else if (el.type === "image") {
          elementNode = (
            <image
              href={el.url}
              x={el.x}
              y={el.y}
              width={el.width}
              height={el.height}
              opacity={el.opacity}
              transform={commonProps.transform}
            />
          )
        }

        return (
          <g key={el.id}>
            {elementNode}
            {isSelected &&
              getTransformHandles(el).map((handle, _i) => (
                <rect
                  key={`handle-${el.id}-${handle.type}`}
                  x={handle.x}
                  y={handle.y}
                  width={handle.width}
                  height={handle.height}
                  fill="white"
                  stroke="blue"
                  strokeWidth="1"
                />
              ))}
          </g>
        )
      })}
    </svg>
  )
}
