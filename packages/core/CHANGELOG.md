# @adraw/core

## 0.2.0

### Minor Changes

- **Line tool**: new `line` element type with `startX`/`startY`/`endX`/`endY`, dedicated line tool in the tool system, hit testing, selection stroke, and rotation support.

- **Auto-switch to select**: after creating an element with any creation tool (rectangle, ellipse, line, draw), the canvas automatically switches to the select tool. The newly created element is also automatically selected. Automatic selection can be prevented when needed.

- **Light-dark color mode**: color constants now support `light-dark()` CSS color function, enabling automatic theme adaptation via CSS `color-scheme`.

- **Transform overlay improvements**:

  - Overlay now renders immediately on tool change and clears selection on deactivation.
  - `isTransforming` split into `isResizing` and `isRotating` for more granular overlay suppression.
  - Improved rotation handling for multi-selection groups.
  - `selectElements` renamed to `renderSelectElements`.
  - Redundant line stroke update logic removed.

## 0.1.1

### Patch Changes

- **Rendering architecture (major refactor)**

  - **Incremental DOM**: replaced full `innerHTML = ""` wipe with `reconcileElements()` that diffs the DOM: drops stale nodes, updates existing in place, appends new ones. Unchanged elements keep their DOM nodes intact.

  - **Temporary group removed**: in-progress tool elements render directly into `elementsGroup` as the last child, tracked by a reusable `temporaryNode`/`temporaryType`, avoiding node recreation per pointer move.

  - **Persistent transform overlay**: `ensureOverlayNodes()` builds bounding box, 4 edge bands, rotation handle, and 4 resize handles once; `renderTransformOverlay()` updates them in place (\~10 fewer SVG nodes created per pointer move).

  - **`updateElementGeometry()`**: shared in-place update helper for all element types, used by both `reconcileElements()` and `selectElements()`.

- **Select tool**

  - **Marquee/brush selection**: pointer-down on empty space starts a rubber-band box; all intersected elements get selected. Shift-key unions onto existing selection. No history push for selection-only actions.

  - **Multi-element rotation**: orbiting each element's center around the selection center (not just changing rotation). Path elements get points translated. Single elements still rotate in place.

  - **`isTransforming()` / `getSelectionBox()`**: new Tool interface methods; first signals active resize/rotation, second exposes the marquee rect.

  - **Invisible edge bands**: 4 translucent lines on edges act as axis-aligned resize handles via `pointer-events: stroke`.

- **History**

  - **Baseline checkpoint**: the undo stack top now always mirrors current state; `canUndo()` returns false only when only the baseline remains. Fixes undo restoring from the wrong entry and redo pushing stale state onto the undo stack.

- **Styling \& constants**

  - **src/constants.ts**: new file centralizing CSS-var fallback strings (`STROKE_COLOR`, `FILL_COLOR`, `BACKGROUND_COLOR`, `SELECTION_COLOR`) and numeric `STROKE_WIDTH = 2`.

  - **CSS var rename**:

    - `--adraw-stroke-color` → `--adraw-stroke`
    - `--adraw-fill-color` → `--adraw-fill`
    - `--adraw-selection-color` → `--adraw-selection`

  - **Non-scaling stroke**: bounding box and handles use `vector-effect="non-scaling-stroke"` and sizes divided by `viewport.zoom` for screen-pixel consistency.

- **Options \& API**

  - **`hideOverlayWhileTransforming`**: new `CanvasOptions` flag (default true) to hide transform overlay during resize/rotation gestures so it doesn't visually lag. Exposed via `getHideOverlayWhileTransforming()` / `setHideOverlayWhileTransforming()`.

- **Path element**

  - **`fillColor` removed from `PathElement` type and `createPathElement`**: paths render `fill="none"` unconditionally.
