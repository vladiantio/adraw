/* @refresh reload */
import { render } from "solid-js/web"
import App from "./App.tsx"

const root = document.getElementById("root")

// biome-ignore lint/style/noNonNullAssertion: root element
render(() => <App />, root!)
