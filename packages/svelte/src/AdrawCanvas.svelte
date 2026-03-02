<script>
import { createStore, getVisibleElements } from "@adraw/core"
import { onDestroy, onMount } from "svelte"

export let initialState = {}
export let state
export let send

const store = createStore(initialState)
state = store.state
send = store.send

const unsubscribe = store.subscribe((newState) => {
  state = { ...newState }
})

onDestroy(unsubscribe)

let svgRef

const _handlePointer = (type) => (e) => {
  if (!svgRef) return
  const rect = svgRef.getBoundingClientRect()
  send({
    type,
    point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    event: e,
  })
}

const _handleWheel = (e) => {
  if (!svgRef) return
  e.preventDefault()
  const rect = svgRef.getBoundingClientRect()
  send({
    type: "WHEEL",
    deltaX: e.deltaX,
    deltaY: e.deltaY,
    point: { x: e.clientX - rect.left, y: e.clientY - rect.top },
    ctrlKey: e.ctrlKey,
  })
}

onMount(() => {
  const handleKeyDown = (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
    const cmdCtrl = isMac ? e.metaKey : e.ctrlKey

    if (cmdCtrl && e.key.toLowerCase() === "u") {
      e.preventDefault()
      const url = prompt("Enter image/SVG URL:")
      if (url) {
        send({
          type: "ADD_IMAGE",
          url,
          point: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        })
      }
    }

    if (cmdCtrl && e.key.toLowerCase() === "z") {
      e.preventDefault()
      if (e.shiftKey) send({ type: "REDO" })
      else send({ type: "UNDO" })
    }

    switch (e.key.toLowerCase()) {
      case "v":
        send({ type: "SET_TOOL", tool: "select" })
        break
      case "h":
        send({ type: "SET_TOOL", tool: "hand" })
        break
      case "d":
        send({ type: "SET_TOOL", tool: "draw" })
        break
      case "e":
        send({ type: "SET_TOOL", tool: "erase" })
        break
      case "r":
        send({ type: "SET_TOOL", tool: "rectangle" })
        break
      case "delete":
      case "backspace":
        send({ type: "DELETE_SELECTED" })
        break
    }
  }
  window.addEventListener("keydown", handleKeyDown)
  return () => window.removeEventListener("keydown", handleKeyDown)
})

$: visibleElements = getVisibleElements(state)
</script>

<svg
	bind:this={svgRef}
    role="img"
    aria-label="Infinite Canvas"
	style="width: 100%; height: 100%; display: block; touch-action: none;"
	viewBox="{state.viewBox.x} {state.viewBox.y} {state.viewBox.width} {state.viewBox.height}"
	on:pointerdown={handlePointer("POINTER_DOWN")}
	on:pointermove={handlePointer("POINTER_MOVE")}
	on:pointerup={handlePointer("POINTER_UP")}
	on:wheel|preventDefault={handleWheel}
>
    <title>Infinite Canvas</title>
	<rect
		x={state.viewBox.x}
		y={state.viewBox.y}
		width={state.viewBox.width}
		height={state.viewBox.height}
		fill="#ffffff"
	/>
	{#each visibleElements as el (el.id)}
		{@const isSelected = state.selectedElementIds.includes(el.id)}
        {@const rotationDeg = (el.rotation * 180) / Math.PI}
        {@const cx = el.x + el.width / 2}
        {@const cy = el.y + el.height / 2}
		<g transform="rotate({rotationDeg}, {cx}, {cy})">
			{#if el.type === "rectangle"}
				<rect
					x={Math.min(el.x, el.x + el.width)}
					y={Math.min(el.y, el.y + el.height)}
					width={Math.abs(el.width)}
					height={Math.abs(el.height)}
					stroke={el.stroke}
					fill={el.fill}
					stroke-width={el.strokeWidth}
					stroke-dasharray={isSelected ? "5,5" : undefined}
				/>
			{:else if el.type === "ellipse"}
				<ellipse
					cx={el.x + el.width / 2}
					cy={el.y + el.height / 2}
					rx={Math.abs(el.width) / 2}
					ry={Math.abs(el.height) / 2}
					stroke={el.stroke}
					fill={el.fill}
					stroke-width={el.strokeWidth}
					stroke-dasharray={isSelected ? "5,5" : undefined}
				/>
			{:else if el.type === "star"}
				<polygon
					points={getStarPoints(el.x, el.y, el.width, el.height, el.points, el.innerRadius)}
					stroke={el.stroke}
					fill={el.fill}
					stroke-width={el.strokeWidth}
					stroke-dasharray={isSelected ? "5,5" : undefined}
				/>
			{:else if el.type === "polygon"}
				<polygon
					points={getPolygonPoints(el.x, el.y, el.width, el.height, el.sides)}
					stroke={el.stroke}
					fill={el.fill}
					stroke-width={el.strokeWidth}
					stroke-dasharray={isSelected ? "5,5" : undefined}
				/>
			{:else if el.type === "draw"}
				<path
					d={el.points.map((p, i) => `${i === 0 ? "M" : "L"} ${el.x + p.x} ${el.y + p.y}`).join(" ")}
					stroke={el.stroke}
					fill="none"
					stroke-width={el.strokeWidth}
					stroke-dasharray={isSelected ? "5,5" : undefined}
				/>
			{:else if el.type === "image"}
				<image
					href={el.url}
					x={el.x}
					y={el.y}
					width={el.width}
					height={el.height}
					opacity={el.opacity}
				/>
			{/if}

			{#if isSelected}
				{#each getTransformHandles(el) as handle (handle.type)}
					<rect
						x={handle.x}
						y={handle.y}
						width={handle.width}
						height={handle.height}
						fill="white"
						stroke="blue"
						stroke-width="1"
					/>
				{/each}
			{/if}
		</g>
	{/each}
</svg>
