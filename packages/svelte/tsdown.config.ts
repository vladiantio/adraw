import svelte from "rollup-plugin-svelte"
import { sveltePreprocess } from "svelte-preprocess"

import { tsdownConfig } from "../../config/index.ts"
import { svelteDtsPlugin } from "./scripts/tsdown-plugin-svelte-dts.ts"
import { svelteModuleTypesPlugin } from "./scripts/tsdown-plugin-svelte-module-types.ts"

export default tsdownConfig({
  // declarations come from svelteDtsPlugin (svelte2tsx emitDts); tsdown's own
  // dts pass can't parse .svelte files
  dts: false,
  plugins: [
    svelteModuleTypesPlugin(),
    svelte({ preprocess: sveltePreprocess() }),
    svelteDtsPlugin({
      moduleName: "@adraw/svelte",
    }),
  ],
})
