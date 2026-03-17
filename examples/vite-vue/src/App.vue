<script setup lang="ts">
import type { ToolType } from "@adraw/core"
import type { Canvas } from "@adraw/vue"
import { onMounted, ref } from "vue"

const canvasRef = ref<InstanceType<typeof Canvas> | null>(null)

const tools: { id: ToolType; label: string; shortcut: string }[] = [
  { id: "select", label: "Select", shortcut: "V" },
  { id: "hand", label: "Hand", shortcut: "H" },
  { id: "rectangle", label: "Rectangle", shortcut: "R" },
  { id: "ellipse", label: "Ellipse", shortcut: "E" },
  { id: "draw", label: "Draw", shortcut: "D" },
  { id: "eraser", label: "Eraser", shortcut: "E" },
]

const activeTool = ref<ToolType>("select")

function setTool(tool: ToolType) {
  activeTool.value = tool
}
</script>

<template>
  <div class="app">
    <div class="toolbar">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :class="{ active: activeTool === tool.id }"
        @click="setTool(tool.id)"
        :title="`${tool.label} (${tool.shortcut})`"
      >
        {{ tool.label }}
      </button>
    </div>
    <div ref="canvasRef" class="canvas-container" />
  </div>
</template>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
.app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  font-family: system-ui, sans-serif;
}
.toolbar {
  display: flex;
  gap: 4px;
  padding: 8px;
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
}
.toolbar button {
  padding: 8px 12px;
  border: 1px solid #ccc;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}
.toolbar button:hover {
  background: #e8e8e8;
}
.toolbar button.active {
  background: #2196f3;
  color: white;
  border-color: #1976d2;
}
.canvas-container {
  flex: 1;
  width: 100%;
  background: white;
}
</style>
