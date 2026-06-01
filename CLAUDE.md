# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeoMatrix Frame Creator is a browser-based visual editor for designing LED matrix animations for WS2812 (NeoPixel) LED matrices. Users click on a grid to define pixel patterns, manage multiple animation frames, preview scrolling animations, and export designs as JSON, CSV, or ready-to-compile Rust code.

**Live demo**: https://technical-1.github.io/NeoMatrix-FrameCreator/

## Development

**No build system** - The shipped app has zero runtime dependencies (vanilla JS loaded via `<script>`). To develop:

1. Open `index.html` in a browser
2. Edit HTML/CSS/JS files directly
3. Refresh browser to see changes

**Testing**: `npm test` runs the suite (`node:test`). Pure logic lives in `lib.js` and is unit-tested directly; DOM behaviour is covered by jsdom integration tests in `tests/dom.test.js`. The only dev dependencies are `jsdom` and `canvas` (test-time only). New pure logic should go in `lib.js` with a matching test rather than inline in `script.js`.

**Deployment**: Push to `main` branch; GitHub Pages auto-deploys.

## Architecture

Client-side SPA with a pure-logic library and a Node test suite:
- `index.html` - Semantic HTML5 structure with ARIA accessibility
- `style.css` - CSS custom properties design system, responsive layout, dark neon theme (~1340 lines)
- `lib.js` - DOM-free pure logic (coordinate geometry, colour helpers, GIF LZW/palette encoding, import validation, GIF export sizing). Attaches to `window` in the browser and is `require()`-d by tests (~310 lines)
- `script.js` - All DOM/UI application logic (~1645 lines)
- `tests/` - `node:test` unit tests plus jsdom DOM-integration tests, run with `npm test`

### Design System (CSS Custom Properties)

The UI uses a dark theme with neon accents defined in `:root`:
- **Colors**: `--neon-cyan` (#00f0ff), `--neon-magenta` (#ff00aa), `--neon-green` (#00ff6a)
- **Backgrounds**: `--bg-primary` (#0a0a0f) through `--bg-elevated` (#1a1a2e)
- **Typography**: Orbitron (display), JetBrains Mono (body)
- **Spacing**: `--space-xs` through `--space-2xl` scale
- **Dynamic cell color**: `--cell-on` and `--cell-on-glow` are updated via JavaScript when user changes the color picker
- **Responsive sizing**: `--cell-size` adjusts at 768px and 1024px breakpoints

### Key Data Structures

```javascript
let GRID_WIDTH = 8;
let GRID_HEIGHT = 8;
let frames = [{ coords: [], name: "Frame 1" }];
let ledColor = "#00f0ff";
let undoStack = [];
let redoStack = [];
const STORAGE_KEY = 'neomatrix-autosave';
```

State is persisted to localStorage with autosave every 30 seconds and on page unload.

### Core Abstractions

**Coordinate System Mapping** (`lib.js:33-63`): The `indexToRowCol()` and `rowColToIndex()` functions (in the pure-logic library) handle translation between DOM button indices and logical (row, col) coordinates across four orientation modes (top-left, top-right, bottom-left, bottom-right). This abstraction lets the rest of the code remain orientation-agnostic, and being DOM-free it is exhaustively round-trip tested in `tests/geometry.test.js`.

**Undo/Redo System** (`script.js:148-245`): Stack-based state management with `snapshotState()`, `saveState()`, `undo()`, and `redo()`. Snapshots capture frames, current index, grid dimensions **and** orientation (so undoing an origin change can't restore pixels under the wrong mapping). Maximum 50 undo steps. Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y or Ctrl+Shift+Z (redo).

**Painting (click + drag)** (`script.js:418-508`): `beginPaint()`/`applyPaintAt()`/`endPaint()` implement click-and-drag painting for both mouse and touch. A stroke calls `saveState()` once (one undo step per stroke) and touches each cell at most once. The first cell sets the stroke mode: *erase* if it's already lit in the current colour, otherwise *paint*. `handleCellClick()` is now a one-cell wrapper over this for keyboard/programmatic activation; `setupPainting()` binds the document `mouseup` and container touch handlers once.

**Frame Thumbnails with Drag & Drop** (`script.js:745-866`): The `renderFrameThumbnails()` function creates mini-grid previews. HTML5 Drag and Drop API enables frame reordering via `handleDragStart/Over/Enter/Leave/Drop/End()` event handlers.

**LocalStorage Autosave** (`script.js:77-146`): The `setupAutosave()`, `saveToStorage()`, and `loadFromStorage()` functions persist all state (grid dimensions, orientation, color, frames) to localStorage. Loading reuses `validateImportedData()` from `lib.js`, so stale or malformed autosave data is clamped/normalized rather than crashing the app.

**Megaframe Scrolling** (`script.js:941-962`): The `buildMegaFrame()` function concatenates all non-empty frames horizontally with bounding-box calculations for the scrolling preview. Empty frames are excluded via the shared `nonEmptyFrames()` helper (`lib.js`) so the scroll math — and the generated Rust — never compute a width from `isize::MAX/MIN`.

**Rust Code Generation** (`script.js:1139-1262`): The `generateRustCode()` function produces a complete `.rs` file with an `NmScroll` struct, const arrays for each non-empty frame, and animation logic compatible with the `smart_leds` crate.

**GIF Export** (`script.js:1264-1497`): The `GifEncoder` class and `downloadGIF()` render the scroll animation to a canvas and encode a looping GIF89a. Sizing is bounded by `planGifExport()` (`lib.js`) — it shrinks per-cell resolution for large grids and refuses exports whose buffered ImageData would exceed a memory budget. Palette/LZW encoding (`buildGifPalette()`, `gifLzwEncode()`) live in `lib.js`, capping the colour table at 256 with nearest-colour mapping.

**Dynamic Color Picker** (`script.js:271-299`): The `setupColorPicker()` and `updateCellColor()` functions update CSS custom properties in real-time when the user selects a new LED color.

**Toast Notifications** (`script.js:1499-1522`): The `showToast()` function provides user feedback for actions with auto-dismiss animation.

### Function Groups in script.js

Approximate ranges (they drift as the file changes — the section divider comments are the durable anchors):

| Lines | Purpose |
|-------|---------|
| 9-36 | Global state (GRID_WIDTH, GRID_HEIGHT, frames, undo/redo stacks, `gridButtons` cache) |
| 37-75 | App initialization |
| 76-150 | LocalStorage autosave system |
| 151-249 | Undo/Redo system |
| 250-266 | Info panel toggle |
| 267-303 | Color picker with dynamic CSS updates |
| 304-354 | Keyboard navigation (Ctrl+Z/Y, Ctrl+Arrow, Space, Esc) |
| 355-596 | Grid creation/rendering, click-drag painting, orientation & resize |
| 597-740 | Frame management (new/duplicate/delete/prev/next/clear) |
| 741-866 | Frame thumbnails with drag-and-drop reordering |
| 867-871 | Orientation mapping (stub — the geometry now lives in `lib.js`) |
| 872-982 | Scrolling animation engine |
| 983-1262 | Import/Export (JSON, CSV, Rust generation, download utilities) |
| 1263-1497 | GIF export (`GifEncoder`, `downloadGIF`) |
| 1498-1522 | Toast notification system |
| 1523-1637 | Finished modal (Rust preview + focus trap) |
| 1638-1646 | Initialize on load |

### Responsive Breakpoints

- **< 768px**: Mobile layout, fixed footer export bar, smaller cells
- **768px-1024px**: Tablet, inline export buttons
- **> 1024px**: Desktop, larger cells

## Features

- **Rectangular grid support**: Separate width and height (1-64 each)
- **Click-and-drag painting**: Paint or erase across many cells in one mouse/touch stroke, collapsed into a single undo step
- **Per-pixel color**: Each pixel stores its own colour (the picker sets the colour for newly painted pixels)
- **Undo/Redo**: 50-step history with Ctrl+Z/Ctrl+Y
- **Frame management**: Create, duplicate, delete, reorder (drag & drop)
- **LocalStorage autosave**: Persists work between sessions
- **Color picker**: Live preview color selection
- **Multi-format export**: JSON, CSV, animated GIF, Rust code
- **Import**: Load previously exported JSON files
- **Keyboard shortcuts**: Full keyboard navigation support
- **Accessibility**: ARIA labels, focus indicators, reduced motion support

## Known Limitations

- Changing the grid **orientation/origin** keeps the drawing in place: every pixel is transformed to the new corner (`reorientFrames` in `lib.js`), so the picture is unchanged on screen while the exported `(row,col)` addressing follows the new origin. **Resizing** the grid keeps pixels that still fit and trims only out-of-bounds ones (`clampFramesToGrid` in `lib.js`). Neither action wipes your frames.
- The animation model is a continuous horizontal **scroll** — frames are concatenated into a megaframe, so there is no per-frame "hold"/flipbook timing (single global speed).
- Mobile drag-and-drop for frame **reordering** may be less intuitive than desktop.
