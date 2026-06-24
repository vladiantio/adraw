import { defineConfig, type UserConfig } from "tsdown"

export const tsdownConfig = (options?: UserConfig) =>
  defineConfig({
    clean: true,
    dts: true,
    entry: ["src/index.ts"],
    fixedExtension: false,
    format: ["cjs", "esm"],
    sourcemap: true,
    ...options,
  })
