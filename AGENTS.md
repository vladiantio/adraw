# adraw

## Commands

All commands run from the repo root using `pnpm`.

```bash
# Install dependencies
pnpm install

# Build
pnpm build:all          # all packages
pnpm --filter=core build  # single package

# Dev (watch mode)
pnpm dev:all
pnpm dev:web

# Lint / format
pnpm lint               # check
pnpm lint:fix           # auto-fix

# Tests
pnpm test              # all tests
pnpm test run packages/core/src/__tests__/coordinates.test.ts  # single file

# End-to-end tests (Playwright)
pnpm test:e2e:install  # download browsers + OS deps (one-time)
pnpm test:e2e          # run Playwright tests
pnpm test:e2e:ui       # run with the Playwright UI
```

Linter is **oxlint** + formatter is **oxfmt** (2-space indent, double quotes, no trailing semicolons).

## Architecture

This is a pnpm monorepo. Workspaces: `packages/*`, `examples/*`, `web`.

### Core design (`packages/core`)

A single **`AdrawCanvas` class** (`src/canvas.ts`) holds both the pure logic and the DOM adapter:

- **State/logic**: elements, viewport, tool state, and history. Emits typed events (`change`, `viewportChange`, `toolChange`, `selectionChange`) via a lightweight `on`/`off`/`emit` system. This part works headless.
- **DOM adapter**: creates and manages an `<svg>` inside a container `HTMLElement`, wires pointer/wheel/touch/keyboard events, and updates SVG on every state change.

Construct with `new AdrawCanvas({ container })` to mount immediately, or `new AdrawCanvas()` for a headless instance and call `mount(container)` later (e.g. framework bindings build state during component setup, then `mount` on the container at mount time). `destroy()` tears down the DOM.

### Tool system (`src/tools/`)

Each tool implements the `Tool` interface from `src/tools/base.ts`:

```ts
interface Tool {
  type: ToolType
  cursor: string
  onActivate(ctx: ToolContext): void
  onDeactivate(ctx: ToolContext): void
  onPointerDown(ctx: ToolContext, point: Point, event: PointerEvent): void
  onPointerMove(ctx: ToolContext, point: Point, event: PointerEvent): void
  onPointerUp(ctx: ToolContext, point: Point, event: PointerEvent): void
  getTemporaryElement(): CanvasElement | null
}
```

`ToolContext` is the bridge back to canvas state — tools mutate elements and selection through context setters (`setElements`, `setSelectedIds`, etc.), never by direct field access. Pointer coordinates passed to tools are already in canvas space (converted via `screenToCanvas` in `canvas.ts`).

### Coordinate system (`src/coordinates.ts`)

Canvas origin is at the center. `screenToCanvas` converts a screen-space pointer position (relative to the SVG element) into canvas space accounting for `viewport.zoom` and `viewport.x/y` (pan). All tool handlers receive canvas-space points.

### Framework bindings

Each binding in `packages/{react,vue,svelte,solid}` creates an `AdrawCanvas` imperatively and keeps reactive state (elements, viewport, activeTool, selectedIds) in sync by listening to core events. React and SolidJS both use `CanvasProvider` context + hooks (`useTool`, `useViewport`, `useHistory`, `useSelection`) — each `CanvasProvider` owns an independent `AdrawCanvas`, so multiple instances can be nested side by side. Svelte uses `createCanvas` + a module-level singleton via `useCanvas()`.

### Creating a new adapter package

To add support for another framework (a new `packages/<framework>`), match the existing adapters — pick whichever of `react`, `vue`, `solid`, `svelte` is architecturally closest to the target framework and copy its shape rather than inventing a new one.

**Package scaffolding**

- `package.json`: name `@adraw/<framework>`, `@adraw/core` as `"workspace:*"` in `dependencies`, the framework itself pinned in `devDependencies` and given a loose minimum in `peerDependencies` (e.g. `">=17.0.0"`). Copy `main`/`module`/`types`/`exports` verbatim from an existing adapter — that dual ESM/CJS shape is produced by tsdown and shouldn't be hand-tweaked. Fill in `description`, `keywords`, `homepage`, `bugs`, `repository.directory` the same way the other adapters do.
- `scripts`: `"build": "tsdown --minify"`, `"dev": "tsdown --watch"`.
- `tsconfig.json`: `"extends": "../../tsconfig.json"`, `outDir: "./dist"`, plus whatever `jsx`/`jsxImportSource` the framework requires (see `react` vs `solid` tsconfig for the two styles).
- `tsdown.config.ts`: just `export default tsdownConfig()` imported from `../../config/index.ts` — don't override `entry`/`format` per-package.
- `README.md`: install snippet (pnpm + npm), peer dependency note, a quick-start example, and a hooks/props reference table — mirror `packages/react/README.md`'s structure and heading order.
- No workspace registration needed beyond adding the directory — `pnpm-workspace.yaml` already globs `packages/*`.

**Wrapping `AdrawCanvas`**

- One `AdrawCanvas` per canvas instance, headless (`new AdrawCanvas(options)`) then `mount(container)` once the DOM node exists; keep the instance itself out of reactive state (store it in a ref/plain variable, not a signal/store) and call `destroy()` on teardown.
- Declare `Canvas<Framework>Options extends CanvasOptions` even if it adds nothing yet.
- Mirror core state into the framework's reactivity primitive by subscribing to all four events, always copying the payload rather than storing it by reference (`new Map(newElements)`, `new Set(newSelectedIds)`):
  - `"change"` → `elements`
  - `"viewportChange"` → `viewport`
  - `"toolChange"` → `activeTool`
  - `"selectionChange"` → `selectedIds`
- Expose the identical hook/composable surface every adapter exposes — same names, same return shape, so app code calling these hooks is portable across frameworks:
  - `useCanvas()`
  - `useTool()` → `{ tool, setTool }`
  - `useViewport()` → `{ viewport, setViewport, zoomIn, zoomOut, resetZoom, zoomToFit }`
  - `useHistory()` → `{ undo, redo, canUndo, canRedo }`
  - `useSelection()` → `{ selectedIds, elements, selectAll, clearSelection, deleteSelected }`
  - All methods on these must no-op / return a safe default (`false`, empty `Map`/`Set`) when the canvas isn't mounted yet, rather than throwing.
- Provide a `Canvas` component that renders the mount container, creates the canvas on mount, and destroys it on unmount.
- How the instance is threaded from creation site to the hooks is framework-idiomatic and doesn't need to match other adapters (React and Solid use `CanvasProvider` context; Svelte uses a singleton set by `createCanvas`/`initCanvas`) — only the public hook names/shapes need to match. Context-based adapters support multiple independent canvas instances per page; singleton-based ones don't.
- Add any client-only directive the framework's SSR story requires (e.g. React's `"use client"` at the top of `components.tsx`).

**Verifying**

- Add a matching `examples/vite-<framework>` app that imports the new package, following the layout of the other `examples/vite-*` apps.
- Run `pnpm --filter=<framework> build` and `pnpm lint` before considering the adapter done.

**Angular is a special case (`packages/angular`)**

Angular can't follow the tsdown recipe above — a consumable Angular library needs the Angular compiler's partial-Ivy output. It mirrors the same public surface (component-scoped `CanvasService` via `provideCanvas()`, `useCanvas/useTool/useViewport/useHistory/useSelection` as `inject()`-based hooks) but the build/packaging differs:

- **Build tool is `ng-packagr`, not tsdown.** `scripts`: `"build": "ng-packagr -p ng-package.json"`, `"dev": "ng-packagr -p ng-package.json --watch"`. Config lives in `ng-package.json` (`dest: "./dist"`, `lib.entryFile: "src/public-api.ts"`, and `allowedNonPeerDependencies: ["@adraw/core"]` so ng-packagr stops erroring on the non-peer workspace dep).
- **`tsconfig.json` does NOT extend `../../tsconfig.json`** — the root's `erasableSyntaxOnly`, `verbatimModuleSyntax`, `noEmit`, and `allowImportingTsExtensions` all conflict with Angular decorators / ng-packagr emit. Use a standalone tsconfig (`useDefineForClassFields: false`, `experimentalDecorators: false`) with `angularCompilerOptions.compilationMode: "partial"`.
- **Pin Angular `^21` in devDeps.** Angular 20's `compiler-cli` peers on TypeScript `<5.9`; the repo is on 5.9.x, so v21 is the first compatible major. Peer range is `>=17.0.0` (standalone + signals).
- **`tslib` is a required runtime `dependency`.** ng-packagr forces `importHelpers: true` (it overrides the project tsconfig — `importHelpers: false` is ignored), so the partial compiler emits helper refs and the build dies with `TS2354` if tslib is absent. It does _not_ appear in the final FESM (the linker rewrites decorators to static `ɵcmp`/`ɵprov`), so grepping the bundle misleadingly shows it "unused" — do not remove it.
- **Source manifest entry points:** ng-packagr writes the real `exports`/`module`/`typings` into `dist/package.json`, but pnpm links the _source_ dir, so the source `package.json` must also carry `module` + `typings` pointing at `./dist/...` — without them a consumer/example fails with rollup "Failed to resolve entry for package". Keep it to `module` + `typings`: adding an `exports` map in the source manifest makes ng-packagr print benign `WARNING: Found a conflicting export condition … would be overridden` for every condition it regenerates (Vite falls back to `module` when there's no `exports`, so the map buys nothing locally).
- **`pnpm-workspace.yaml` `allowBuilds`** needs `@parcel/watcher` (ng-packagr watch) plus `lmdb` and `msgpackr-extract` (`@angular/build`, pulled in by the example's Analog plugin) — otherwise `pnpm --filter build` fails its pre-run deps check with `ERR_PNPM_IGNORED_BUILDS`.
- **`.oxlintrc.json`** has a scoped override for `packages/angular/**` + `examples/vite-angular/**` turning off `new-cap` (fires on `@Component()`/`@Injectable()` decorators) and `typescript/no-extraneous-class` (empty root component).
- **The example** (`examples/vite-angular`) runs Angular in Vite via `@analogjs/vite-plugin-angular` (zoneless, signal-based), not the Angular CLI. The plugin defaults to reading `tsconfig.app.json`, so provide one (extending the app `tsconfig.json`, `include: ["src"]`).
- Reactive values are returned as **signals** (Angular's reactivity primitive) — read them by calling them, including in templates (`tool()`).

**Web Components is a special case (`packages/web-components`)**

Web Components have no framework runtime, reactive primitive, or component tree — the custom element itself is the idiomatic handle. It still follows the tsdown recipe (build/packaging identical to `react`/`solid`/`svelte`) and has **no framework peer dependency** (no `devDependencies`/`peerDependencies` for a framework — it's native DOM), but it deliberately **skips the shared `useCanvas/useTool/useViewport/useHistory/useSelection` hook surface**:

- **No hooks.** In every other adapter the hooks bridge core state into a reactivity system; Web Components has none, so element-argument hooks (`useTool(el)`) would be pure wrappers over `el.canvas?.setActiveTool(...)` and the mirrored fields — redundant. Drive the canvas through `element.canvas` (the `AdrawCanvas` instance, carrying the full API) and read state from the element's mirrored fields directly. Do **not** re-add the hooks to "match" the other adapters.
- **The element is the whole public surface.** `AdrawCanvasElement` (`src/element.ts`, registered via `defineAdrawCanvas(tagName?)`) still does the standard adapter job: one headless `AdrawCanvas` created on `connectedCallback` / `destroy()`d on `disconnectedCallback`, instance kept out of any reactive store, and the four core events mirrored onto public fields (`elements`, `viewport`, `activeTool`, `selectedIds`) copying each payload (`new Map`/`new Set`).
- **Events, not subscriptions, signal changes.** Core events are re-dispatched as `adraw:*` `CustomEvent`s (`adraw:change`, `adraw:viewportchange`, `adraw:toolchange`, `adraw:selectionchange`) whose `detail` carries the mirrored value — consumers listen to these to know when to re-read the fields (the example wires `adraw:toolchange` to refresh the toolbar).
- **No `Canvas` component either** — the element _is_ the mount container; consumers place `<adraw-canvas>` in markup (or `new AdrawCanvasElement()`), setting `.options` before connect for snapping/viewport config.

### Element types

Defined in `src/types.ts`. All elements extend `BaseElement` (id, x, y, width, height, rotation, zIndex, locked, visible). Factory functions in `src/elements.ts` (`createRectangle`, `createEllipse`, `createPath`, `createMedia`, etc.) auto-generate IDs.

### Rendering

`AdrawCanvas` renders elements to SVG using `createElementGroup` (`src/canvas.ts`). Styling uses CSS custom properties: `--adraw-stroke`, `--adraw-fill`, `--adraw-background`, `--adraw-selection`. These defaults are centralized in `src/constants.ts` as CSS-var-with-fallback strings (`STROKE_COLOR`, `FILL_COLOR`, `BACKGROUND_COLOR`, `SELECTION_COLOR`) plus a numeric `STROKE_WIDTH` — reference those constants from `canvas.ts` and the tools rather than re-inlining literal `var(--adraw-*, …)` strings. The transform overlay (selection handles, rotation handle) is rendered in a separate `<g>` layer on top; its resize/rotation handles are sized in screen pixels (divided by `viewport.zoom`) so they stay a constant on-screen size regardless of zoom.

Committed elements live in a single `.adraw-elements-group` `<g>`; the SVG has just two child layers, that elements group plus the transform overlay (there is **no** separate temporary group). Rendering is **incremental — never `innerHTML = ""` on the elements group**:

- **`reconcileElements()`** is the `"change"` path for non-`select` tools. It diffs the DOM against the current element map: drops nodes for elements that no longer exist (iterating `children` backwards, since it's a live collection), creates + appends nodes for new elements, and updates existing nodes in place. So adding one element does **not** re-render the others — their DOM nodes are left untouched.
- **`selectElements()`** is the `"change"`/`"selectionChange"` path while the `select` tool is active — same incremental drop-missing logic, but it only re-geometries the currently selected nodes (drag performance).
- **`updateElementGeometry(group, element)`** is the shared in-place update helper (transform + type-specific attrs for path/rectangle/ellipse/media) used by both of the above.
- **`renderTemporary()`** renders the active tool's in-progress element (`getTemporaryElement()`) directly into `.adraw-elements-group` as its last child (so it sits on top), tracked by the `temporaryNode` field (with `temporaryType` remembering its element type). It **reuses that one node** across pointer moves — while the type is unchanged it updates it in place via `updateElementGeometry` rather than recreating it; it only builds a fresh node when there is none yet or the type changed, and removes it when there's no temporary element. Committed elements are left intact. On commit, the tool adds the real element to the map (→ `reconcileElements` appends its node) and clears its temporary element (→ next `renderTemporary` drops the temp node).

The temporary node carries the `.adraw-temporary` class but **not** `.adraw-element`, so it isn't counted as a committed element (the e2e specs rely on this).

## Tests

Unit tests live in `packages/core/src/__tests__/`. Cover coordinate math, history (undo/redo stacks), and element utilities. Run with Vitest (`pnpm test`). `vitest.config.ts` scopes Vitest to `packages/**`, so the Playwright specs under `e2e/` are **not** picked up by `pnpm test` — run those with Playwright (see below).

### End-to-end tests (Playwright)

Driven by `@playwright/test`. Scripts live in the root `package.json`: `test:e2e`, `test:e2e:ui`, and `test:e2e:install`.

**Installing Playwright**

On a supported distro (Ubuntu/Debian) install the browsers and their OS dependencies in one step:

```bash
pnpm test:e2e:install   # = playwright install --with-deps
pnpm test:e2e           # verify it works
```

**Arch Linux / Fedora / other distros (via distrobox)**

Playwright's `--with-deps` uses `apt` and only supports Debian/Ubuntu, so the bundled browsers won't run reliably on Arch Linux, Fedora and other Linux distros. Run the e2e tests inside an Ubuntu container with [distrobox](https://distrobox.it/) — the container shares your `$HOME`, so the repo and `pnpm` install are visible from both sides.

First time only, create the container:

```bash
distrobox create --name pw --image ubuntu:24.04
```

Then enter it and install the Playwright dependencies + browsers, and confirm the tests pass:

```bash
distrobox enter pw
# inside the container:
sudo apt-get install libatomic1
pnpm test:e2e:install           # installs OS deps (apt) + browsers
pnpm test:e2e                   # should pass — install verified
```

After the one-time setup, run `distrobox enter pw` and `pnpm test:e2e` whenever you need to run or debug e2e tests interactively. Keep everyday `pnpm test` (Vitest), builds, and linting on the host — only the Playwright browsers need the container.

**Running e2e non-interactively (from a wrapper / the Claude Code Bash tool)**

`distrobox enter pw` works with `--` to run a single command in the container, but `pnpm test:e2e` invoked this way is flaky: the run gets killed with **exit code 144 and no output** (the heavy child-process tree — the config's `webServer` step runs `pnpm --filter=core build` (tsdown/rolldown) then a long-running vite server — trips a resource guard). Trivial container commands (`distrobox enter pw -- echo hi`, a single `chromium.launch()`) are fine; only the full run flakes.

Invoke the Playwright CLI **directly** (not through the `pnpm test:e2e` script), non-interactively, with an explicit reporter so the HTML reporter doesn't try to auto-serve a report:

```bash
# Full suite (all desktop projects)
distrobox enter pw -- bash -lc \
  'node node_modules/@playwright/test/cli.js test --reporter=list --workers=2'

# One project / one file / one test (fast iteration)
distrobox enter pw -- bash -lc \
  'node node_modules/@playwright/test/cli.js test selection.spec.ts:52 --project=chromium --reporter=list --workers=1'
```

Notes:

- Playwright's own `webServer` (in `playwright.config.ts`) still builds `@adraw/core` and starts the vanilla example on `http://localhost:5173`; that step works when the CLI is launched this way. If a stale server is already bound to 5173, `pkill -f vite` on the host first.
- The retried run may intermittently still hit exit 144 — just re-run; it is not deterministic.
- The project matrix is **desktop-only** (`chromium`, `firefox`, `webkit`). Mobile viewports are intentionally omitted: the demo toolbar isn't responsive at narrow widths and the specs drive the canvas with mouse/pointer input, not touch. Add touch-gesture specs before re-enabling mobile projects.
- The specs target the `examples/vite-vanilla` demo, which exposes its `AdrawCanvas` instance on `window.adraw` so tests can assert real state (active tool, elements, viewport, history).
