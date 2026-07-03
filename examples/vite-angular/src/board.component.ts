import { Canvas, provideCanvas } from "@adraw/angular"
import { Component, input } from "@angular/core"

import { Toolbar } from "./toolbar.component"

// Each <app-board> provides its own CanvasService via provideCanvas(), so the
// two boards on the page are fully independent canvases. The toolbar and
// <adraw-canvas> below both inject that same service.
@Component({
  imports: [Canvas, Toolbar],
  providers: [provideCanvas()],
  selector: "app-board",
  styles: [
    `
      .board {
        flex: 1;
        min-width: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      .canvas-container {
        flex: 1;
        width: 100%;
        background: white;
      }
    `,
  ],
  template: `
    <div class="board">
      <app-toolbar [label]="label()" />
      <adraw-canvas class="canvas-container" />
    </div>
  `,
})
export class Board {
  readonly label = input("")
}
