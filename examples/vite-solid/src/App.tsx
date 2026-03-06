import type { ToolType } from "@adraw/core"
import { createSignal } from "solid-js"

const tools: { id: ToolType; label: string; shortcut: string }[] = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "hand", label: "Hand", shortcut: "H" },
  { id: "rectangle", label: "Rectangle", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", shortcut: "E" },
  { id: "star", label: "Star", shortcut: "S" },
  { id: "draw", label: "Draw", shortcut: "D" },
  { id: "eraser", label: "Eraser", shortcut: "E" },
]

function App() {
  const [activeTool, setActiveTool] = createSignal<ToolType>("select")

  return (
    <div class="app">
      <div class="toolbar">
        {tools.map((tool) => (
          <button
            class={activeTool() === tool.id ? "active" : ""}
            onClick={() => setActiveTool(tool.id)}
            title={`${tool.label} (${tool.shortcut})`}
          >
            {tool.label}
          </button>
        ))}
      </div>
      <div class="canvas-container" />
    </div>
  )
}

export default App
