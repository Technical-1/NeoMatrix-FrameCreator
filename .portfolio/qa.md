# Project Q&A

## Project Overview

NeoMatrix Frame Creator is a browser-based visual editor for designing LED matrix animations. It allows users to click on a grid to define pixel patterns, manage multiple animation frames, preview scrolling animations, and export the designs as JSON data or ready-to-compile Rust code. I built this tool for the University of Florida's CEN4907C Computer Engineering Design 1 course, specifically to help students working with WS2812 (NeoPixel) LED matrices in their embedded Rust projects.

**Problem Solved**: Manually calculating LED coordinates for matrix animations is tedious and error-prone. This tool provides immediate visual feedback and generates the exact code format students need.

**Target Users**: Computer engineering students, hobbyists working with LED matrices, and anyone building NeoPixel/WS2812 projects who wants a visual design tool.

## Key Features

### Dynamic Rectangular Grid
Users can set any grid size from 1x1 to 64x64 with independent width and height, matching their physical LED matrix dimensions. The grid renders dynamically using CSS Grid, with each cell becoming a clickable button.

### Multi-Color Pixel Art
Each pixel stores its own color. Click a cell with the color picker to set it, click an active pixel with a different color to change it, or click with the same color to toggle it off. This enables full multi-color designs within a single frame.

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

## Technical Highlights

### Challenge: Coordinate System Mapping
LED matrices have different physical wiring orientations. A pixel at visual position (2,3) might be at hardware position (5,2) depending on how the matrix is wired.

**Solution**: I created bidirectional mapping functions (`indexToRowCol` and `rowColToIndex`) with a switch statement handling all four orientations. This abstraction keeps the rest of the code orientation-agnostic.

### Challenge: Rust Code Generation
Generating syntactically correct Rust code from JavaScript required careful string templating.

**Solution**: The `generateRustCode()` function builds a complete Rust module using template literals. It includes:
- Proper const definitions for frame data
- A `NmScroll` struct with methods
- Bounding-box calculations for efficient scrolling
- Type-safe array declarations

### Challenge: Animation Preview Performance
Animating a grid of DOM elements could cause jank.

**Solution**: Instead of moving elements, I toggle CSS classes and set per-pixel `--pixel-color` CSS custom properties. The browser's style recalculation is highly optimized for class and custom property changes, keeping animations smooth even on larger grids with multiple colors.

### Challenge: Client-Side GIF Encoding
I needed animated GIF export without any external library dependency.

**Solution**: I wrote a complete GIF89a encoder (~190 lines) that handles the full spec: global color table construction, LZW compression with variable code sizes, Netscape Application Extension for looping, and sub-block framing. The encoder renders each animation frame to a Canvas 2D context with LED glow effects (outer glow, inner glow, specular highlight), then quantizes pixels against a dynamically built color palette.

### Challenge: Per-Pixel Color Support
The original design used a single global color. Supporting multi-color designs required changes across the entire data flow.

**Solution**: Each coordinate now stores its own `color` property. The grid cells use a CSS custom property `--pixel-color` set via inline styles, which the `color-mix()` function references for glow effects. The Rust code generator maps each pixel's hex color to RGB components using `hexToRgb()`. A migration path handles loading old single-color saves by backfilling the global `ledColor`.

### Innovative Approach: Zero-Dependency Architecture
I intentionally avoided all runtime dependencies. This eliminates supply chain risks, ensures the tool works indefinitely without maintenance, and allows instant forking/modification by students.

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
**A**: Yes. The repository is public on GitHub. Since there's no build system, just fork, edit the HTML/CSS/JS files directly, and submit a pull request. No npm install or toolchain setup required.

### Q: How accurate is the scrolling preview compared to real hardware?
**A**: The preview shows the same pixels that will light up on hardware, but timing may differ. Browser `setInterval` isn't perfectly precise, and your embedded system's loop timing varies. Use the preview for visual verification, then tune delay values on actual hardware.

### Q: How does the multi-color system work?
**A**: The toolbar includes a color picker that lets you select any color. Each pixel stores its own color independently, so you can paint different pixels in different colors within the same frame. When you click a lit pixel with a different color selected, it updates that pixel's color. The generated Rust code includes per-pixel RGB values, and the GIF export renders each pixel in its actual color with glow effects.

### Q: What happens if I set a very large grid size?
**A**: The tool allows up to 64x64 (4,096 cells). Performance remains acceptable, but the cells become small. For very large matrices, consider using the tool to design smaller sprites and tiling them in code.

### Q: Is there mobile support?
**A**: The tool works on mobile browsers but the experience is suboptimal. The grid cells are sized for mouse interaction. Touch targets are technically usable but cramped on phone screens. A tablet works reasonably well.
