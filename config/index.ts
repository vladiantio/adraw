import { defineConfig, type Options } from "tsup"

export const tsupConfig = (options?: Options) =>
  defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: true,
    ...options,
  })
