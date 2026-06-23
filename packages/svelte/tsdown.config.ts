import { tsdownConfig } from "../../config/index.ts"

export default tsdownConfig({
  deps: {
    neverBundle: ["svelte", "@adraw/core"],
  },
})
