# @adraw/solid

SolidJS bindings for adraw — primitives and components for building canvas-based drawing and whiteboard UIs.

## Installation

```bash
pnpm add @adraw/solid

# npm
npm install @adraw/solid
```

SolidJS 1.0 or later is required as a peer dependency.

## Quick start

Call `initCanvas` on mount to attach the drawing surface, then use the composable helpers anywhere in the component tree.

```tsx
import { onMount } from "solid-js"
import { initCanvas, useTool } from "@adraw/solid"

function Toolbar() {
  const { tool, setTool } = useTool()
  return (
    <div>
      <button onClick={() => setTool("select")}>Select</button>
      <button onClick={() => setTool("draw")}>Draw</button>
    </div>
  )
}

export default function App() {
  let container!: HTMLDivElement

  onMount(() => {
    initCanvas(container)
  })

  return (
    <div
      style={{ display: "flex", "flex-direction": "column", height: "100vh" }}
    >
      <Toolbar />
      <div ref={container} style={{ flex: 1 }} />
    </div>
  )
}
```

## API

### `createCanvas(options?)`

Creates a reactive canvas instance. Returns `{ core, activeTool, elements, viewport, selectedIds }` where `activeTool`, `elements`, `viewport`, and `selectedIds` are SolidJS signals.

```ts
const { core, elements, viewport, activeTool, selectedIds } = createCanvas({
  snapping: { snapEnabled: true },
})
core.mount(containerEl)
```

### `initCanvas(container, options?)`

Convenience function that calls `createCanvas`, mounts into `container`, stores the instance globally, and returns the `AdrawCanvas` core. Use this for the common single-canvas case.

### `useCanvas()`

Returns the global canvas instance created by `initCanvas`.

### `useTool()`

```ts
const { tool, setTool } = useTool()
// tool: ToolType — reactive getter
setTool("rectangle")
```

### `useViewport()`

```ts
const { viewport, setViewport, zoomIn, zoomOut, resetZoom, zoomToFit } =
  useViewport()
// viewport: ViewportState — reactive getter
```

### `useHistory()`

```ts
const { undo, redo, canUndo, canRedo } = useHistory()
```

### `useSelection()`

```ts
const { selectedIds, elements, selectAll, clearSelection, deleteSelected } =
  useSelection()
// selectedIds / elements: reactive getters
```

## License

MIT
