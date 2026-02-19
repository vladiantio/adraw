import * as Adraw from "@adraw/react"
import { useState } from "react"

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Vite + React</h1>
      <div>
        <button type="button" onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <Adraw.Root>Hola</Adraw.Root>
    </>
  )
}

export default App
