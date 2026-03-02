import sveltePlugin from "esbuild-svelte"
import sveltePreprocess from "svelte-preprocess"
import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: false, // DTS often fails with Svelte in tsup
  splitting: false,
  sourcemap: true,
  clean: true,
  esbuildPlugins: [
    sveltePlugin({
      preprocess: sveltePreprocess(),
    }),
  ],
})
