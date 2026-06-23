import { tsdownConfig } from "../../config/index.ts"

export default tsdownConfig({
  deps: {
    neverBundle: ["vue", "@adraw/core"],
  },
})
