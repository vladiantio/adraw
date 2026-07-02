// oxlint-disable import/no-nodejs-modules
import { rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import process from "node:process"

import { createBundle } from "dts-buddy"
import { emitDts } from "svelte2tsx"

interface Options {
  moduleName: string
  libRoot?: string
  output?: string
  svelteShimsPath?: string
  tsconfig?: string
}

export function svelteDtsPlugin(options: Options) {
  // closeBundle fires once per output format (ESM + CJS); share the in-flight
  // run so parallel builds don't write the same files concurrently.
  let running: Promise<void> | null = null

  const generate = async () => {
    const {
      moduleName,
      libRoot = "./src",
      output = "./dist/index.d.ts",
      svelteShimsPath = "node_modules/svelte2tsx/svelte-shims-v4.d.ts",
      tsconfig = "tsconfig.json",
    } = options

    const tempDir = resolve(process.cwd(), "node_modules/.tmp/svelte-dts")

    await rm(tempDir, { force: true, recursive: true })

    // dts-buddy can't compile .svelte files itself, so first let svelte2tsx
    // emit a per-module .d.ts tree, then stitch it into a single bundle.
    await emitDts({
      declarationDir: tempDir,
      libRoot: resolve(process.cwd(), libRoot),
      svelteShimsPath: resolve(process.cwd(), svelteShimsPath),
      tsconfig: resolve(process.cwd(), tsconfig),
    })

    await createBundle({
      modules: { [moduleName]: join(tempDir, "index.d.ts") },
      output: resolve(process.cwd(), output),
      project: resolve(process.cwd(), tsconfig),
    })

    await rm(tempDir, { force: true, recursive: true })

    console.log("Svelte DTS bundle complete")
  }

  return {
    async closeBundle() {
      running ??= generate().finally(() => {
        running = null
      })

      try {
        await running
      } catch (error) {
        console.error("❌ Svelte DTS bundle failed:", error)
        throw error
      }
    },
    name: "tsdown-plugin-svelte-dts",
  }
}
