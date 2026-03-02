import { AdrawCanvas, useAdraw } from "@adraw/react"

function App() {
  const { state, send } = useAdraw()

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          padding: "10px",
          borderBottom: "1px solid #ccc",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "select" })}
        >
          Select (V)
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "rectangle" })}
        >
          Rect (R)
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "ellipse" })}
        >
          Ellipse
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "star" })}
        >
          Star
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "polygon" })}
        >
          Poly
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "draw" })}
        >
          Draw (D)
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "hand" })}
        >
          Hand (H)
        </button>
        <button
          type="button"
          onClick={() => send({ type: "SET_TOOL", tool: "erase" })}
        >
          Erase (E)
        </button>
        <button type="button" onClick={() => send({ type: "UNDO" })}>
          Undo (Ctrl+Z)
        </button>
        <button type="button" onClick={() => send({ type: "REDO" })}>
          Redo (Ctrl+Shift+Z)
        </button>
        <span style={{ marginLeft: "auto" }}>
          Tool: {state?.tool} | Zoom: {state?.zoom.toFixed(2)} | Elements:{" "}
          {state?.elements.length}
        </span>
      </div>
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <AdrawCanvas state={state} send={send} />
      </div>
    </div>
  )
}

export default App
