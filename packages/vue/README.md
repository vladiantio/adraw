# @adraw/vue

Vue bindings for adraw — composables and components for building canvas-based drawing and whiteboard UIs.

## Installation

```bash
npm install @adraw/vue @adraw/core
```

Vue 3.0 or later is required as a peer dependency.

## Quick start

Use the `Canvas` component to render the drawing surface. Composables access the canvas state anywhere in the tree.

```vue
<script setup lang="ts">
import { Canvas, useTool } from "@adraw/vue"

const { tool, setTool } = useTool()
</script>

<template>
  <div style="display: flex; flex-direction: column; height: 100vh">
    <div>
      <button :class="{ active: tool === 'select' }" @click="setTool('select')">
        Select
      </button>
      <button :class="{ active: tool === 'draw' }" @click="setTool('draw')">
        Draw
      </button>
      <button
        :class="{ active: tool === 'rectangle' }"
        @click="setTool('rectangle')"
      >
        Rectangle
      </button>
    </div>
    <Canvas style="flex: 1" />
  </div>
</template>
```

## Components

### `Canvas`

Mounts the drawing surface inside a `div` that fills its parent. Registers the canvas instance on `window.__adrawVueCanvas` so composables can access it.

```vue
<Canvas class="my-canvas" :style="{ borderRadius: '8px' }" />
```

| Prop    | Type                  | Description   |
| ------- | --------------------- | ------------- |
| `class` | `string`              | CSS class     |
| `style` | `Record<string, any>` | Inline styles |

## Composables

All composables read from the canvas instance stored by `Canvas`. They should be called after the `Canvas` component has been mounted.

### `createCanvas(options?)`

Low-level factory. Returns `{ core, state, vanilla }`.

- `core` — the `AdrawCanvas` instance
- `state` — a Vue `reactive` object with `elements`, `viewport`, `activeTool`, and `selectedIds`
- `vanilla` — a `ref` to the `AdrawCanvas` instance (set after `core.mount()`)

### `useCanvas()`

Returns the canvas instance stored on `window.__adrawVueCanvas`.

### `useTool()`

```ts
const { tool, setTool } = useTool()
// tool: getter — "select" | "hand" | "draw" | "eraser" | "rectangle" | "ellipse" | "media"
setTool("draw")
```

### `useViewport()`

```ts
const { viewport, setViewport, zoomIn, zoomOut, resetZoom, zoomToFit } =
  useViewport()
// viewport: getter — { x: number, y: number, zoom: number }
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
