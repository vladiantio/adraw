<script lang="ts">
import type { Snippet } from "svelte"
import { createCanvasContext, type CanvasSvelteOptions } from "./context.svelte.ts"

interface Props {
  children: Snippet
  options?: CanvasSvelteOptions
}

let { children, options }: Props = $props()

createCanvasContext(() => options)
</script>

{@render children()}
