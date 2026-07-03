import angular from "@analogjs/vite-plugin-angular"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [angular()],
})
