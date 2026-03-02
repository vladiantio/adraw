import {
  type AdrawEvent,
  type AdrawState,
  createStore,
  getPolygonPoints,
  getStarPoints,
  getTransformHandles,
  getVisibleElements,
} from "@adraw/core"
import {
  defineComponent,
  h,
  onMounted,
  onUnmounted,
  type PropType,
  ref,
} from "vue"

export function useAdraw(initialState: Partial<AdrawState> = {}) {
  const store = createStore(initialState)
  const state = ref<AdrawState>(store.state)

  const unsubscribe = store.subscribe((newState) => {
    state.value = { ...newState }
  })

  onUnmounted(unsubscribe)

  onMounted(() => {
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
    onUnmounted(() => window.removeEventListener("keydown", handleKeyDown))
  })

  return {
    state,
    send: store.send,
  }
}

export const AdrawCanvas = defineComponent({
  props: {
    state: { type: Object as PropType<AdrawState>, required: true },
    send: {
      type: Function as PropType<(event: AdrawEvent) => void>,
      required: true,
    },
  },
  setup(props) {
    const svgRef = ref<SVGSVGElement | null>(null)

    const handlePointer =
      (type: "POINTER_DOWN" | "POINTER_MOVE" | "POINTER_UP") =>
      (e: PointerEvent) => {
        if (!svgRef.value) return
        const rect = svgRef.value.getBoundingClientRect()
        props.send({
          type,
          point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
          event: e,
        })
      }

    const handleWheel = (e: WheelEvent) => {
      if (!svgRef.value) return
      e.preventDefault()
      const rect = svgRef.value.getBoundingClientRect()
      props.send({
        type: "WHEEL",
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
        ctrlKey: e.ctrlKey,
      })
    }

    return () => {
      const { state } = props
      const visibleElements = getVisibleElements(state)

      return h(
        "svg",
        {
          ref: svgRef,
          role: "img",
          "aria-label": "Infinite Canvas",
          style: {
            width: "100%",
            height: "100%",
            display: "block",
            touchAction: "none",
          },
          viewBox: `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.width} ${state.viewBox.height}`,
          onPointerdown: handlePointer("POINTER_DOWN"),
          onPointermove: handlePointer("POINTER_MOVE"),
          onPointerup: handlePointer("POINTER_UP"),
          onWheel: handleWheel,
        },
        [
          h("title", "Infinite Canvas"),
          h("rect", {
            x: state.viewBox.x,
            y: state.viewBox.y,
            width: state.viewBox.width,
            height: state.viewBox.height,
            fill: "#f0f0f0",
          }),
          ...visibleElements.map((el) => {
            const isSelected = state.selectedElementIds.includes(el.id)
            const baseProps = {
              key: el.id,
              stroke: el.stroke,
              fill: el.fill,
              "stroke-width": el.strokeWidth,
              "stroke-dasharray": isSelected ? "5,5" : undefined,
              transform: `rotate(${(el.rotation * 180) / Math.PI}, ${el.x + el.width / 2}, ${el.y + el.height / 2})`,
            }

            let elementNode = null
            if (el.type === "rectangle") {
              elementNode = h("rect", {
                ...baseProps,
                x: Math.min(el.x, el.x + el.width),
                y: Math.min(el.y, el.y + el.height),
                width: Math.abs(el.width),
                height: Math.abs(el.height),
              })
            } else if (el.type === "ellipse") {
              elementNode = h("ellipse", {
                ...baseProps,
                cx: el.x + el.width / 2,
                cy: el.y + el.height / 2,
                rx: Math.abs(el.width) / 2,
                ry: Math.abs(el.height) / 2,
              })
            } else if (el.type === "star") {
              elementNode = h("polygon", {
                ...baseProps,
                points: getStarPoints(
                  el.x,
                  el.y,
                  el.width,
                  el.height,
                  el.points,
                  el.innerRadius,
                ),
              })
            } else if (el.type === "polygon") {
              elementNode = h("polygon", {
                ...baseProps,
                points: getPolygonPoints(
                  el.x,
                  el.y,
                  el.width,
                  el.height,
                  el.sides,
                ),
              })
            } else if (el.type === "draw") {
              const d = el.points
                .map(
                  (p, i) =>
                    `${i === 0 ? "M" : "L"} ${el.x + p.x} ${el.y + p.y}`,
                )
                .join(" ")
              elementNode = h("path", { ...baseProps, d, fill: "none" })
            } else if (el.type === "image") {
              elementNode = h("image", {
                href: el.url,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                opacity: el.opacity,
                transform: baseProps.transform,
              })
            }

            const children = [elementNode]
            if (isSelected) {
              getTransformHandles(el).forEach((handle, _i) => {
                children.push(
                  h("rect", {
                    key: `handle-${el.id}-${handle.type}`,
                    x: handle.x,
                    y: handle.y,
                    width: handle.width,
                    height: handle.height,
                    fill: "white",
                    stroke: "blue",
                    "stroke-width": 1,
                  }),
                )
              })
            }

            return h("g", { key: el.id }, children)
          }),
        ],
      )
    }
  },
})
