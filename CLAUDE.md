# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeoMatrix Frame Creator is a browser-based visual editor for designing LED matrix animations for WS2812 (NeoPixel) LED matrices. Users click on a grid to define pixel patterns, manage multiple animation frames, preview scrolling animations, and export designs as JSON, CSV, or ready-to-compile Rust code.

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
- `style.css` - CSS custom properties design system, responsive layout, dark neon theme (~1150 lines)
- `script.js` - All application logic (~1145 lines)

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

**Coordinate System Mapping** (`script.js:729-772`): The `indexToRowCol()` and `rowColToIndex()` functions handle translation between DOM button indices and logical (row, col) coordinates across four orientation modes (top-left, top-right, bottom-left, bottom-right). This abstraction lets the rest of the code remain orientation-agnostic.

**Undo/Redo System** (`script.js:129-211`): Stack-based state management with `saveState()`, `undo()`, and `redo()` functions. Maximum 50 undo steps. Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y (redo).

**Frame Thumbnails with Drag & Drop** (`script.js:606-723`): The `renderFrameThumbnails()` function creates mini-grid previews. HTML5 Drag and Drop API enables frame reordering via `handleDragStart/Over/Enter/Leave/Drop/End()` event handlers.

**LocalStorage Autosave** (`script.js:71-123`): The `setupAutosave()`, `saveToStorage()`, and `loadFromStorage()` functions persist all state (grid dimensions, orientation, color, frames) to localStorage.

**Megaframe Scrolling** (`script.js:843-881`): The `buildMegaFrame()` function concatenates all frames horizontally with bounding-box calculations for the scrolling preview.

**Rust Code Generation** (`script.js:1008-1110`): The `generateRustCode()` function produces a complete `.rs` file with an `NmScroll` struct, const arrays for each frame, and animation logic compatible with the `smart_leds` crate.

**Dynamic Color Picker** (`script.js:234-267`): The `setupColorPicker()` and `updateCellColor()` functions update CSS custom properties in real-time when the user selects a new LED color.

**Toast Notifications** (`script.js:1116-1135`): The `showToast()` function provides user feedback for actions with auto-dismiss animation.

### Function Groups in script.js

| Lines | Purpose |
|-------|---------|
| 9-28 | Global state (GRID_WIDTH, GRID_HEIGHT, frames, undo/redo stacks) |
| 34-65 | App initialization |
| 71-123 | LocalStorage autosave system |
| 129-211 | Undo/Redo system |
| 217-228 | Info panel toggle |
| 234-267 | Color picker with dynamic CSS updates |
| 273-318 | Keyboard navigation (Ctrl+Z/Y, Ctrl+Arrow, Space, Esc) |
| 324-458 | Grid creation and rendering with accessibility |
| 464-600 | Frame management (new/duplicate/delete/prev/next/clear) |
| 606-723 | Frame thumbnails with drag-and-drop reordering |
| 729-772 | Coordinate system orientation mapping |
| 778-881 | Scrolling animation engine |
| 887-1006 | Import/Export (JSON, CSV, file download utilities) |
| 1008-1110 | Rust code generation |
| 1116-1135 | Toast notification system |

### Responsive Breakpoints

- **< 768px**: Mobile layout, fixed footer export bar, smaller cells
- **768px-1024px**: Tablet, inline export buttons
- **> 1024px**: Desktop, larger cells

## Features

- **Rectangular grid support**: Separate width and height (1-64 each)
- **Undo/Redo**: 50-step history with Ctrl+Z/Ctrl+Y
- **Frame management**: Create, duplicate, delete, reorder (drag & drop)
- **LocalStorage autosave**: Persists work between sessions
- **Color picker**: Live preview color selection
- **Multi-format export**: JSON, CSV, Rust code
- **Import**: Load previously exported JSON files
- **Keyboard shortcuts**: Full keyboard navigation support
- **Accessibility**: ARIA labels, focus indicators, reduced motion support

## Known Limitations

- Grid size changes clear all frames (by design, to avoid coordinate conflicts)
- Single color per session (all frames share the selected color)
- Mobile drag-and-drop for frame reordering may be less intuitive than desktop
