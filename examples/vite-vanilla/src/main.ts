import "./index.css"
import type { ToolType } from "@adraw/core"
import { AdrawCanvas } from "@adraw/vanilla"

// biome-ignore lint/style/noNonNullAssertion: root element
const container = document.querySelector<HTMLDivElement>("#app")!

const toolbar = document.createElement("div")
toolbar.className = "toolbar"
toolbar.innerHTML = `
  <button data-tool="select" title="Select (V)">Select</button>
  <button data-tool="hand" title="Hand (H)">Hand</button>
  <button data-tool="rectangle" title="Rectangle (R)">Rectangle</button>
  <button data-tool="ellipse" title="Ellipse (E)">Ellipse</button>
  <button data-tool="draw" title="Draw (D)">Draw</button>
  <button data-tool="eraser" title="Eraser (E)">Eraser</button>
  <div class="separator"></div>
  <button data-action="undo" title="Undo (Ctrl+Z)">Undo</button>
  <button data-action="redo" title="Redo (Ctrl+Shift+Z)">Redo</button>
  <div class="separator"></div>
  <button data-action="zoom-in" title="Zoom In">+</button>
  <button data-action="zoom-out" title="Zoom Out">-</button>
  <button data-action="zoom-fit" title="Zoom to Fit">Fit</button>
  <button data-action="reset" title="Reset">Reset</button>
`

const canvasContainer = document.createElement("div")
canvasContainer.className = "canvas-container"
canvasContainer.style.cssText = "width: 100%; height: calc(100vh - 50px);"

container.appendChild(toolbar)
container.appendChild(canvasContainer)

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
    const action = btn.dataset.action
    switch (action) {
      case "undo":
        vanilla.undo()
        break
      case "redo":
        vanilla.redo()
        break
      case "zoom-in":
        vanilla.zoomIn()
        break
      case "zoom-out":
        vanilla.zoomOut()
        break
      case "zoom-fit":
        vanilla.zoomToFit()
        break
      case "reset":
        vanilla.resetZoom()
        break
    }
  })
})

function updateToolbar() {
  const activeTool = vanilla.getActiveTool()
  buttons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tool === activeTool)
  })
}

updateToolbar()
