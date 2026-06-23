import { tsdownConfig } from "../../config/index.ts"

export default tsdownConfig({
  deps: {
    neverBundle: ["react", "react-dom", "@adraw/core"],
  },
})
