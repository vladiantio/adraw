import { tsupConfig } from "../../config"

export default tsupConfig({
  external: ["svelte", "@adraw/core", "@adraw/vanilla"],
})
