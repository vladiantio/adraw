<script setup lang="ts">
import Board from "./Board.vue"
</script>

<template>
  <div class="app">
    <Board label="Canvas A" />
    <div class="app-separator" />
    <Board label="Canvas B" />
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
  font-family: system-ui, sans-serif;
}
.app-separator {
  width: 1px;
  background: #ddd;
}
</style>
