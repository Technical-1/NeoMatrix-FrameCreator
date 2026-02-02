# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeoMatrix Frame Creator is a browser-based visual editor for designing LED matrix animations for WS2812 (NeoPixel) LED matrices. Users click on a grid to define pixel patterns, manage multiple animation frames, preview scrolling animations, and export designs as JSON or ready-to-compile Rust code.

**Live demo**: https://technical-1.github.io/NeoMatrix-FrameCreator/

## Development

**No build system** - This is a zero-dependency vanilla JavaScript project. To develop:

1. Open `index.html` in a browser
2. Edit HTML/CSS/JS files directly
3. Refresh browser to see changes

**Deployment**: Push to `main` branch; GitHub Pages auto-deploys.

## Architecture

Three-file client-side SPA:
- `index.html` - Semantic HTML5 structure with ARIA accessibility
- `style.css` - CSS custom properties design system, responsive layout, dark neon theme
- `script.js` - All application logic (~750 lines)

### Design System (CSS Custom Properties)

The UI uses a dark theme with neon accents defined in `:root`:
- **Colors**: `--neon-cyan` (#00f0ff), `--neon-magenta` (#ff00aa), `--neon-green` (#00ff6a)
- **Backgrounds**: `--bg-primary` (#0a0a0f) through `--bg-elevated` (#1a1a2e)
- **Typography**: Orbitron (display), JetBrains Mono (body)
- **Spacing**: `--space-xs` through `--space-2xl` scale
- **Responsive sizing**: `--cell-size` adjusts at 768px and 1024px breakpoints

### Key Data Structure

```javascript
let frames = [{ coords: [], name: "Frame 1" }];
// coords: array of {row, col} objects representing lit pixels
```

State lives in memory only (no localStorage by design).

### Core Abstractions

**Coordinate System Mapping** (`script.js:341-384`): The `indexToRowCol()` and `rowColToIndex()` functions handle translation between DOM button indices and logical (row, col) coordinates across four orientation modes (top-left, top-right, bottom-left, bottom-right). This abstraction lets the rest of the code remain orientation-agnostic.

**Megaframe Scrolling** (`script.js:468-494`): The `buildMegaFrame()` function concatenates all frames horizontally with bounding-box calculations for the scrolling preview. This mirrors how content scrolls across physical LED matrices.

**Rust Code Generation** (`script.js:589-704`): The `generateRustCode()` function produces a complete `.rs` file with an `NmScroll` struct, const arrays for each frame, and animation logic compatible with the `smart_leds` crate.

**Toast Notifications** (`script.js:715-735`): The `showToast()` function provides user feedback for actions with auto-dismiss animation.

### Function Groups in script.js

| Lines | Purpose |
|-------|---------|
| 13-18 | Global state (GRID_SIZE, gridOrientation, frames) |
| 28-40 | App initialization |
| 46-57 | Info panel toggle |
| 63-94 | Keyboard navigation (Ctrl+Arrow for frames, Space for play, Esc to stop) |
| 104-240 | Grid creation and rendering with accessibility |
| 246-335 | Frame management (new/prev/next/clear) |
| 341-384 | Coordinate system orientation mapping |
| 393-512 | Scrolling animation engine |
| 521-704 | Export logic (JSON, Rust code generation) |
| 715-735 | Toast notification system |

### Responsive Breakpoints

- **< 768px**: Mobile layout, fixed footer export bar, smaller cells
- **768px-1024px**: Tablet, inline export buttons
- **> 1024px**: Desktop, larger cells

## Known Limitations

- Square grids only (N x N); rectangular support would require modifying `createGrid()` and coordinate functions
- No undo/redo
- No import capability (export-only by design)
- Grid size changes clear all frames
- Single color in preview (hardware uses any RGB8 color via Rust constructor)
