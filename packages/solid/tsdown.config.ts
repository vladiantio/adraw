import solid from "rolldown-plugin-solid"

import { tsdownConfig } from "../../config/index.ts"

export default tsdownConfig({
  plugins: [solid()],
})
