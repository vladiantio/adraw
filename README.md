# @adraw

A lightweight, accessible, infinite canvas library for React, Vue, Svelte, SolidJS, and Vanilla JS.

## Features

- **Infinite Canvas**: SVG-based, scalable, and lightweight.
- **Tools**: Select, Hand, Draw, Eraser, Rectangle, Ellipse.
- **Accessibility**: WAI-ARIA compliant with keyboard shortcuts.
- **Snapping**: Elements snap to other elements.
- **Zoom/Pan**: Smooth navigation with mouse wheel and hand tool.
- **Multi-framework**: Native support for all major web frameworks.

## Installation

```bash
pnpm add @adraw/core @adraw/react # or @adraw/vue, @adraw/vanilla, etc.
```

## Packages

- `@adraw/core`: Core logic and state machine.
- `@adraw/vanilla`: Vanilla JS implementation.
- `@adraw/react`: React components and hooks.
- `@adraw/vue`: Vue components and composables.
- `@adraw/svelte`: Svelte components and stores.
- `@adraw/solid`: SolidJS components and primitives.

## Usage (React Example)

```tsx
import { useAdraw, AdrawCanvas } from "@adraw/react";

function App() {
  const { state, send } = useAdraw();

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <button onClick={() => send({ type: "SET_TOOL", tool: "rectangle" })}>
        Rectangle
      </button>
      <AdrawCanvas state={state} send={send} />
    </div>
  );
}
```

## Keyboard Shortcuts

- `V`: Select Tool
- `H`: Hand Tool
- `D`: Draw Tool
- `E`: Erase Tool
- `R`: Rectangle Tool
- `Delete/Backspace`: Delete selected elements
- `Ctrl + Scroll`: Zoom
- `Scroll`: Pan
