import { defineConfig, type UserConfig } from "tsdown"

export const tsdownConfig = (options?: UserConfig) =>
  defineConfig({
    entry: ["src/index.ts"],
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    fixedExtension: false,
    ...options,
  })
