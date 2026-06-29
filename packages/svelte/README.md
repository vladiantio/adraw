# @adraw/svelte

Svelte bindings for adraw — stores and components for building canvas-based drawing and whiteboard UIs.

## Installation

```bash
npm install @adraw/svelte @adraw/core
```

Svelte 4 or later is required as a peer dependency.

## Quick start

Mount the canvas in `onMount`, then use the composable helpers across your component tree.

```svelte
<script lang="ts">
  import { onMount } from "svelte"
  import { createCanvas, useTool } from "@adraw/svelte"

  let container: HTMLDivElement

  onMount(() => {
    const { core } = createCanvas()
    ;(window as any).__adrawSvelteCanvas = { core, state }
    core.mount(container)
  })

  const { tool, setTool } = useTool()
</script>

<div>
  <button on:click={() => setTool("select")}>Select</button>
  <button on:click={() => setTool("draw")}>Draw</button>
</div>

<div bind:this={container} style="width: 100%; height: 100vh;" />
```

## API

### `createCanvas(options?)`

Creates a canvas instance with reactive state. Returns `{ core, state }`.

- `core` — the underlying `AdrawCanvas` instance
- `state` — a plain reactive object with `elements`, `viewport`, `activeTool`, and `selectedIds`

```ts
const { core, state } = createCanvas({
  snapping: { snapEnabled: true },
})
core.mount(containerEl)
```

### `Canvas(props)`

A component factory that handles `onMount` / `onDestroy` lifecycle internally. It stores the canvas on `window.__adrawSvelteCanvas` so sibling composables can access it.

### `useCanvas()`

Returns the global canvas instance stored on `window.__adrawSvelteCanvas`.

### `useTool()`

```ts
const { tool, setTool } = useTool()
// tool: getter — "select" | "hand" | "draw" | "eraser" | "rectangle" | "ellipse" | "media"
setTool("eraser")
```

### `useViewport()`

```ts
const { viewport, setViewport, zoomIn, zoomOut, resetZoom, zoomToFit } =
  useViewport()
// viewport: getter — { x, y, zoom }
```

### `useHistory()`

```ts
const { undo, redo, canUndo, canRedo } = useHistory()
```

### `useSelection()`

```ts
const { selectedIds, elements, selectAll, clearSelection, deleteSelected } =
  useSelection()
```

## License

MIT
