import { tsupConfig } from "../../config"

export default tsupConfig({
  external: ["react", "react-dom", "@adraw/core", "@adraw/vanilla"],
})
