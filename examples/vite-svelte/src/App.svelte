<script lang="ts">
import { Canvas, CanvasProvider } from "@adraw/svelte"
import Toolbar from "./Toolbar.svelte"
</script>

<div class="app">
  <div class="boards">
    <div class="board">
      <CanvasProvider>
        <Toolbar />
        <Canvas style="background: white;" />
      </CanvasProvider>
    </div>
    <div class="board">
      <CanvasProvider>
        <Toolbar />
        <Canvas style="background: white;" />
      </CanvasProvider>
    </div>
  </div>
</div>

<style>
  :global(*) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }
  .app {
    width: 100vw;
    height: 100vh;
    font-family: system-ui, sans-serif;
  }
  .boards {
    display: flex;
    width: 100%;
    height: 100%;
  }
  .board {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }
  .board + .board {
    border-left: 2px solid #ddd;
  }
</style>
