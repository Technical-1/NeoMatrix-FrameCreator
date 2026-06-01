# Project Q&A

## Project Overview

NeoMatrix Frame Creator is a browser-based visual editor for designing LED matrix animations. It allows users to click on a grid to define pixel patterns, manage multiple animation frames, preview scrolling animations, and export the designs as JSON data or ready-to-compile Rust code. I built this tool for the University of Florida's CEN4907C Computer Engineering Design 1 course, specifically to help students working with WS2812 (NeoPixel) LED matrices in their embedded Rust projects.

**Problem Solved**: Manually calculating LED coordinates for matrix animations is tedious and error-prone. This tool provides immediate visual feedback and generates the exact code format students need.

**Target Users**: Computer engineering students, hobbyists working with LED matrices, and anyone building NeoPixel/WS2812 projects who wants a visual design tool.

## Key Features

### Dynamic Rectangular Grid
Users can set any grid size from 1x1 to 64x64 with independent width and height, matching their physical LED matrix dimensions. The grid renders dynamically using CSS Grid, with each cell becoming a clickable button. Resizing preserves the pixels that still fit and trims only the out-of-bounds ones, so changing dimensions never wipes a drawing.

### Click-and-Drag Painting
Click a single cell or drag across many in one stroke (mouse or touch) to paint pixels. The first cell in a stroke sets the mode — *erase* if that cell is already lit in the current color, otherwise *paint* — and each cell is touched at most once per stroke. The whole stroke collapses into a single undo step.

### Multi-Color Pixel Art
Each pixel stores its own color. Paint a cell with the color picker to set it, paint an active pixel with a different color to change it, or paint over it with the same color to toggle it off. This enables full multi-color designs within a single frame.

### Multi-Frame Animation Support
Create unlimited animation frames and navigate between them. Each frame maintains its own coordinate set independently. Frames can be reordered via drag-and-drop, duplicated, or deleted.

### Orientation Control
LED matrices can be wired with the origin (0,0) in any corner. I implemented four orientation modes (top-left, top-right, bottom-left, bottom-right) so the visual editor matches the user's physical hardware wiring.

### Real-Time Scrolling Preview
The "Play" button simulates how frames will scroll across the LED matrix. This uses a "megaframe" approach where all frames are concatenated and animated with configurable delay timing (50ms–2000ms).

### Undo/Redo & Autosave
A 50-step undo/redo stack (Ctrl+Z/Ctrl+Y) provides full editing history. All state is automatically saved to localStorage every 30 seconds and on page unload, so work is never lost between sessions.

### Multi-Format Export & Import
- **JSON**: Structured data with full round-trip import support
- **CSV**: Spreadsheet-compatible format with frame, row, col, and color columns
- **GIF**: Animated GIF with LED glow effects rendered via a custom GIF89a encoder
- **Rust Code**: Complete `.rs` file with per-pixel RGB colors, `NmScroll` struct, and animation logic
- **Finished Modal**: View complete Rust code with stats, copy to clipboard, or download
- **Clipboard Copy**: Quick paste JSON into other applications

### Visual Feedback
Clicked cells light up in their chosen color with a neon glow effect, the origin corner is marked with a dashed magenta border and dot, and coordinates display in real-time below the grid.

### Landing Page With First-Visit Story
The root URL opens a short about page that explains where the tool came from — a University of Florida senior design project whose Rust-programmed microprocessor detected which of four directions it was being leaned, where I wanted LED-matrix animations without hand-writing pixel coordinates. First-time visitors read the story and click **Launch editor →**; returning visitors are redirected straight into the editor, and the story stays reachable from an **About** link.

## Technical Highlights

### Orientation-agnostic coordinate system
WS2812 matrices can be wired with the origin in any of four corners, and the visual editor must match the user's physical board. The mapping is centralized in `indexToRowCol()` and `rowColToIndex()` in `lib.js`, with a single switch over the four orientation modes. Every other module — the click handler, the renderer, the Rust code generator — works in logical (row, col) space, so adding a new wiring layout would mean changing one function rather than every consumer. Because the geometry is DOM-free, it is exhaustively round-trip tested (every orientation maps back to itself).

### Custom GIF89a encoder, no library
GIF export is produced by a hand-written `GifEncoder` class in `script.js` that emits a complete GIF89a stream: global color table, Netscape Application Extension for looping, LZW compression with variable code sizes, and sub-block framing. The reusable, DOM-free pieces — palette construction with nearest-color mapping capped at 256 entries (`buildGifPalette`), the LZW encoder (`gifLzwEncode`), and export sizing/memory budgeting (`planGifExport`) — live in `lib.js` and are unit-tested. Each frame is drawn to an off-screen Canvas 2D context with outer glow, inner glow, and specular highlight passes, then quantized against the capped palette. Bundling `gif.js` would have added ~30KB and another supply-chain surface; the inline encoder keeps the shipped project at zero runtime dependencies.

### Per-pixel color via CSS custom properties
Each cell carries a `--pixel-color` CSS variable set inline, which the stylesheet reads through `color-mix()` to produce the neon glow without per-pixel JavaScript animation. Toggling a class and updating a custom property is one of the cheapest things the browser style engine does, so animation stays smooth on 64×64 grids without any canvas fallback. The frame data structure stores `{ row, col, color }` per pixel, and `applyFrameToGrid()` syncs DOM state from this array.

### Rust code generation that actually compiles
`generateRustCode()` emits a complete module — `NmScroll` struct, `next()` scrolling loop, `delay_ms()` helper, and per-pixel `(usize, usize, u8, u8, u8)` frame data — usable as a drop-in `src/` file with the `smart_leds` crate. Bounding-box logic in the generator avoids emitting empty columns, which keeps scroll timing predictable on hardware. The output matches the interface used in the UF CEN4907C course project, so a student can go from grid clicks to working firmware without rewriting any glue code.

### Testable pure-logic split in a no-build app
A zero-build, browser-only app is normally hard to test because every function reaches for the DOM. I pushed the non-trivial logic into `lib.js` — coordinate geometry, import validation/clamping, GIF palette/LZW encoding, megaframe layout, and the pixel-preserving reorient/resize transforms — with no DOM dependency. It attaches to `window` via a plain `<script>` tag in the browser and is `require()`-d directly by a `node:test` suite (82 tests across 14 files), so the gnarly edge cases get unit coverage without spinning up a browser: every orientation round-trips back to itself, palettes overflowing past 256 colors fall back to nearest-color mapping, malformed autosave data is clamped instead of crashing, and imported coordinates outside the grid are trimmed. DOM handlers are covered separately by jsdom integration tests. The shipped app still downloads zero dependencies — `jsdom` and `canvas` are test-time only.

### First-visit redirect as a tested pure function
The landing page must send returning visitors straight to the editor without a router, a server, or a flash of the wrong page. The whole decision is one DOM-free function in `lib.js` — `shouldRedirectHome(hasVisited, search)` — so the navigation rule is unit-tested directly (first visit, returning visitor, the `?home` revisit bypass, and `null`/`undefined` safety) instead of living untestable inside an inline `<script>`. It runs from a `<head>` script before the body paints, so the redirect (`location.replace`) happens with no story flicker, and the bypass uses `URLSearchParams.has('home')` rather than a substring match so an unrelated `?homepage=1` can't suppress it. The "have you been here" signal is a single `neomatrix-visited` localStorage flag, read and written inside `try/catch` so a blocked store just shows the story.

## Engineering Decisions

### Landing page split from the editor
- **Constraint**: The project has a story worth telling (its senior-design origin), but returning users just want the tool — and the site is static, on GitHub Pages, with no router or backend.
- **Options**: One page with a dismissible overlay, client-side hash routing, or two real pages with a redirect.
- **Choice**: Make the story the root (`index.html`) and move the editor to `app.html`, with a first-visit-only redirect backed by the pure `shouldRedirectHome` helper.
- **Why**: The story page becomes the canonical, shareable URL (good for a portfolio piece) while a one-time `localStorage` flag keeps it out of the way for regulars. Putting the decision in a pure function made it testable; a `<head>`-time redirect kept it flicker-free; relative links keep it working under the project subpath.

### No frontend framework
- **Constraint**: The tool is for engineering students who may not have Node.js set up, and it has to keep working on GitHub Pages with zero maintenance.
- **Options**: React + Vite, Svelte, or vanilla JS.
- **Choice**: Vanilla HTML/CSS/JS, one HTML file plus one script and one stylesheet.
- **Why**: No build step means anyone can fork, edit, and host the result instantly. The app has a single screen and a clear data model, so the DOM-manipulation overhead is small.

### Zero runtime dependencies, including for GIF encoding
- **Constraint**: GIF export was a hard requirement, and so was avoiding supply-chain risk on a tool that lives indefinitely on GitHub Pages.
- **Options**: `gif.js` / `gifenc`, server-side encoding, or a custom encoder.
- **Choice**: Hand-written GIF89a encoder in `script.js`.
- **Why**: ~190 lines bought independence from external packages forever. The encoder is scoped to exactly what this app needs (small palettes, modest frame counts), so it does not need to compete with full-featured libraries on edge cases.

### Rust output instead of generic data
- **Constraint**: The target audience writes embedded Rust against the `smart_leds` crate; raw JSON would still require them to write a parser.
- **Options**: Export only JSON/CSV, export multiple language targets, or generate one tightly-targeted Rust module.
- **Choice**: Generate a complete Rust file matching the course's `NmScroll` interface; keep JSON/CSV as secondary exports.
- **Why**: Closing the loop between "I drew a pattern" and "my firmware compiles" is the actual user value. C/Arduino output would be straightforward to add later but was not needed.

### LocalStorage autosave over server persistence
- **Constraint**: No user accounts, no hosting cost, but work must survive accidental refreshes.
- **Options**: Backend with accounts, IndexedDB, or localStorage.
- **Choice**: localStorage with a 30-second interval plus a `beforeunload` flush; JSON export for permanent saves.
- **Why**: The data is small (a few KB even with many frames) and short-lived. Adding a backend would dominate the project's complexity for marginal benefit.

## Frequently Asked Questions

### Q: Why did you build this instead of using existing LED matrix editors?
**A**: Existing tools either export to formats incompatible with our Rust codebase or require installation. I needed a browser-based tool that generates Rust code matching our specific `NmScroll` struct interface used in the course project.

### Q: Can this tool work with non-square matrices?
**A**: Yes. The tool supports rectangular grids with independent width and height from 1x1 to 64x64. The width and height are set separately in the toolbar.

### Q: Why Rust code output instead of C/C++ for Arduino?
**A**: The UF CEN4907C course uses embedded Rust with the `smart_leds` crate. The generated code integrates directly with that ecosystem. Adding C/Arduino export would be straightforward but wasn't needed for our use case.

### Q: How do I use the exported Rust code?
**A**: Download the `.rs` file, add it to your Rust project's `src/` directory, and import the `NmScroll` struct. Call `new()` to create an instance (colors are baked into the frame data), then `next()` in your main loop to advance the animation. Use `NmScroll::delay_ms()` for the recommended timing, and `to_list()` returns the pixel array to send to your LED strip.

### Q: Does the tool save my work between sessions?
**A**: Yes. All state (grid dimensions, orientation, color, frames, and animation speed) is automatically saved to localStorage every 30 seconds and on page unload. When you reopen the tool, your previous session is restored. You can also export to JSON and re-import later for more permanent saves.

### Q: Can I contribute to this project?
**A**: Yes. The repository is public on GitHub. There's no build system, so you can fork, edit the HTML/CSS/JS files directly, and refresh the browser to see changes. If you touch the logic, run `npm install` once (for the `jsdom`/`canvas` dev dependencies) and `npm test` before submitting a pull request — new pure logic should go in `lib.js` with a matching test.

### Q: How accurate is the scrolling preview compared to real hardware?
**A**: The preview shows the same pixels that will light up on hardware, but timing may differ. Browser `setInterval` isn't perfectly precise, and your embedded system's loop timing varies. Use the preview for visual verification, then tune delay values on actual hardware.

### Q: How does the multi-color system work?
**A**: The toolbar includes a color picker that lets you select any color. Each pixel stores its own color independently, so you can paint different pixels in different colors within the same frame. When you paint over a lit pixel with a different color selected, it updates that pixel's color. The generated Rust code includes per-pixel RGB values, and the GIF export renders each pixel in its actual color with glow effects.

### Q: If I resize the grid, do I lose my drawing?
**A**: No. Resizing keeps every pixel that still fits inside the new dimensions and trims only the ones that fall outside the bounds. Changing the origin/orientation also keeps the picture in place on screen — every pixel is transformed to the new corner, so the exported `(row, col)` addressing follows the new origin while the image stays put. Both transforms live in `lib.js` and are covered by tests.

### Q: Do I have to click each cell one at a time?
**A**: No — you can click and drag to paint a whole stroke of cells at once, with mouse or touch. The first cell you touch decides whether the stroke paints or erases, and the entire stroke is a single undo step, so one Ctrl+Z reverts the whole drag.

### Q: What happens if I set a very large grid size?
**A**: The tool allows up to 64x64 (4,096 cells). Performance remains acceptable, but the cells become small. For very large matrices, consider using the tool to design smaller sprites and tiling them in code.

### Q: Is there mobile support?
**A**: The tool works on mobile browsers but the experience is suboptimal. The grid cells are sized for mouse interaction. Touch targets are technically usable but cramped on phone screens. A tablet works reasonably well.

### Q: Why does the site show an about page before the editor, and how do I skip it?
**A**: The root URL is a short landing page about the project's origin; the editor itself is at `app.html`. You only see the story on your first visit — clicking **Launch editor →** records a `neomatrix-visited` flag in localStorage, and every visit after that redirects you straight into the editor. The redirect runs before the page renders, so there's no flash. If you ever want to read the story again, the editor header has an **About** link (`index.html?home=1`); the `home` parameter tells the page to stay put instead of redirecting.
