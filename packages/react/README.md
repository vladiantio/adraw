# @adraw/react

React bindings for adraw — hooks and components for building canvas-based drawing and whiteboard UIs.

## Installation

```bash
npm install @adraw/react @adraw/core
```

React 17 or later is required as a peer dependency.

## Quick start

Wrap your app (or the part that needs the canvas) with `CanvasProvider`, then render the `Canvas` component wherever you want the drawing surface.

```tsx
import { Canvas, CanvasProvider, useTool } from "@adraw/react"

function Toolbar() {
  const { tool, setTool } = useTool()
  return (
    <div>
      <button
        onClick={() => setTool("select")}
        aria-pressed={tool === "select"}
      >
        Select
      </button>
      <button onClick={() => setTool("draw")} aria-pressed={tool === "draw"}>
        Draw
      </button>
      <button
        onClick={() => setTool("rectangle")}
        aria-pressed={tool === "rectangle"}
      >
        Rectangle
      </button>
    </div>
  )
}

export default function App() {
  return (
    <CanvasProvider>
      <Toolbar />
      <Canvas style={{ flex: 1 }} />
    </CanvasProvider>
  )
}
```

## Components

### `<CanvasProvider>`

Context provider that initialises shared canvas state. All hooks and `<Canvas>` must be rendered inside it.

```tsx
<CanvasProvider options={{ snapping: { snapEnabled: true } }}>
  {children}
</CanvasProvider>
```

| Prop      | Type                 | Description                        |
| --------- | -------------------- | ---------------------------------- |
| `options` | `CanvasReactOptions` | Initial snapping / viewport config |

### `<Canvas>`

Mounts the drawing surface. Fills its parent container (`width: 100%; height: 100%`).

```tsx
<Canvas className="my-canvas" style={{ borderRadius: 8 }} />
```

| Prop        | Type                  | Description   |
| ----------- | --------------------- | ------------- |
| `className` | `string`              | CSS class     |
| `style`     | `React.CSSProperties` | Inline styles |

## Hooks

All hooks must be called inside `<CanvasProvider>`.

### `useCanvas()`

Returns the raw context value, including `elements`, `viewport`, `activeTool`, `selectedIds`, and a ref to the underlying `AdrawCanvas` instance (`vanillaRef`).

### `useTool()`

```ts
const { tool, setTool } = useTool()
// tool: ToolType — "select" | "hand" | "draw" | "eraser" | "rectangle" | "ellipse" | "media"
setTool("draw")
```

### `useViewport()`

```ts
const { viewport, setViewport, zoomIn, zoomOut, resetZoom, zoomToFit } =
  useViewport()
// viewport: { x: number, y: number, zoom: number }
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

## Server components (Next.js)

All exports are marked `"use client"`. Import them only from client components or use a dynamic import with `ssr: false`.

## License

MIT
