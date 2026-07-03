import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    // Unit tests live in the packages. The `e2e/` suite is driven by Playwright
    // (its own runner and config), so keep it out of Vitest's globbing.
    include: ["packages/**/*.{test,spec}.{ts,tsx}"],
  },
})
