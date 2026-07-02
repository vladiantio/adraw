import ts from "typescript"

// svelte's compileModule (used by rollup-plugin-svelte for `.svelte.ts` rune
// modules) doesn't understand TypeScript syntax (unlike compile(), which
// handles `<script lang="ts">` itself), so strip types before the svelte
// plugin hands the source to the compiler.
export function svelteModuleTypesPlugin() {
  return {
    name: "tsdown-plugin-svelte-module-types",
    transform(code: string, id: string) {
      if (!id.endsWith(".svelte.ts")) {
        return null
      }

      const result = ts.transpileModule(code, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          sourceMap: true,
          target: ts.ScriptTarget.ESNext,
        },
        fileName: id,
      })

      return {
        code: result.outputText.replace(/\/\/# sourceMappingURL=\S*\s*$/, ""),
        map: result.sourceMapText,
      }
    },
  }
}
