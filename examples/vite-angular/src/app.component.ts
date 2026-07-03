import { Component } from "@angular/core"

import { Board } from "./board.component"

@Component({
  imports: [Board],
  selector: "app-root",
  styles: [
    `
      .app {
        width: 100vw;
        height: 100dvh;
        display: flex;
      }
      .app-separator {
        width: 1px;
        background: #ddd;
      }
    `,
  ],
  template: `
    <div class="app">
      <app-board label="Canvas A" />
      <div class="app-separator"></div>
      <app-board label="Canvas B" />
    </div>
  `,
})
export class App {}
