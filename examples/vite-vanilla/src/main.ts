import "./index.css"
import { AdrawCanvas, type ToolType } from "@adraw/core"

const toolbar = document.querySelector<HTMLDivElement>(".toolbar")!
const canvasContainer =
  document.querySelector<HTMLDivElement>(".canvas-container")!

const vanilla = new AdrawCanvas({
  container: canvasContainer,
})

const buttons = toolbar.querySelectorAll<HTMLButtonElement>("[data-tool]")
buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const tool = btn.dataset.tool as ToolType
    vanilla.setActiveTool(tool)
    updateToolbar()
  })
})

const actionButtons =
  toolbar.querySelectorAll<HTMLButtonElement>("[data-action]")
actionButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const { action } = btn.dataset
    switch (action) {
      case "undo": {
        vanilla.undo()
        break
      }
      case "redo": {
        vanilla.redo()
        break
      }
      case "zoom-in": {
        vanilla.zoomIn()
        break
      }
      case "zoom-out": {
        vanilla.zoomOut()
        break
      }
      case "zoom-fit": {
        vanilla.zoomToFit()
        break
      }
      case "reset": {
        vanilla.resetZoom()
        break
      }
    }
  })
})

function updateToolbar() {
  const activeTool = vanilla.getActiveTool()
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === activeTool)
  })
}

// Keep the toolbar in sync when the tool changes from anywhere (e.g. keyboard
// shortcuts), not only when a toolbar button is clicked.
vanilla.on("toolChange", updateToolbar)

updateToolbar()

// Expose the canvas instance so end-to-end tests can assert on real state
// (active tool, elements, viewport, history).
;(globalThis as unknown as { adraw?: AdrawCanvas }).adraw = vanilla
