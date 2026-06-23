import { tsdownConfig } from "../../config/index.ts"

export default tsdownConfig({
  deps: {
    neverBundle: ["solid-js", "@adraw/core"],
  },
})
