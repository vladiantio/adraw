<script setup lang="ts">
import { CanvasProvider, Canvas } from "@adraw/vue"

import Toolbar from "./Toolbar.vue"

defineProps<{ label: string }>()
</script>

<template>
  <div class="board">
    <CanvasProvider>
      <Toolbar :label="label" />
      <Canvas class="canvas-container" />
    </CanvasProvider>
  </div>
</template>

<style>
.board {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.canvas-container {
  flex: 1;
  width: 100%;
  background: white;
}
</style>
