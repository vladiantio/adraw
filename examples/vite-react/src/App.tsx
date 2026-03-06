import type { ToolType } from "@adraw/core"
import {
  Canvas,
  CanvasProvider,
  useHistory,
  useTool,
  useViewport,
} from "@adraw/react"

function Toolbar() {
  const { tool, setTool } = useTool()
  const { zoomIn, zoomOut, zoomToFit, resetZoom } = useViewport()
  const { undo, redo, canUndo, canRedo } = useHistory()

  const tools: { id: ToolType; label: string; shortcut: string }[] = [
    { id: "select", label: "Select", shortcut: "V" },
    { id: "hand", label: "Hand", shortcut: "H" },
    { id: "rectangle", label: "Rectangle", shortcut: "R" },
    { id: "ellipse", label: "Ellipse", shortcut: "E" },
    { id: "star", label: "Star", shortcut: "S" },
    { id: "draw", label: "Draw", shortcut: "D" },
    { id: "eraser", label: "Eraser", shortcut: "E" },
  ]

  return (
    <div style={styles.toolbar}>
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          style={{
            ...styles.button,
            ...(tool === t.id ? styles.activeButton : {}),
          }}
          onClick={() => setTool(t.id)}
          title={`${t.label} (${t.shortcut})`}
        >
          {t.label}
        </button>
      ))}
      <div style={styles.separator} />
      <button
        type="button"
        style={styles.button}
        onClick={undo}
        disabled={!canUndo()}
      >
        Undo
      </button>
      <button
        type="button"
        style={styles.button}
        onClick={redo}
        disabled={!canRedo()}
      >
        Redo
      </button>
      <div style={styles.separator} />
      <button type="button" style={styles.button} onClick={zoomIn}>
        +
      </button>
      <button type="button" style={styles.button} onClick={zoomOut}>
        -
      </button>
      <button type="button" style={styles.button} onClick={zoomToFit}>
        Fit
      </button>
      <button type="button" style={styles.button} onClick={resetZoom}>
        Reset
      </button>
    </div>
  )
}

function App() {
  return (
    <CanvasProvider>
      <div style={styles.app}>
        <Toolbar />
        <Canvas
          style={{
            width: "100%",
            height: "calc(100vh - 50px)",
            background: "white",
          }}
        />
      </div>
    </CanvasProvider>
  )
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: "100vw",
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    fontFamily: "system-ui, sans-serif",
  },
  toolbar: {
    display: "flex",
    gap: "4px",
    padding: "8px",
    background: "#f5f5f5",
    borderBottom: "1px solid #ddd",
    flexWrap: "wrap",
  },
  button: {
    padding: "8px 12px",
    border: "1px solid #ccc",
    background: "white",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
  activeButton: {
    background: "#2196f3",
    color: "white",
    borderColor: "#1976d2",
  },
  separator: {
    width: "1px",
    background: "#ddd",
    margin: "0 8px",
  },
}

export default App
