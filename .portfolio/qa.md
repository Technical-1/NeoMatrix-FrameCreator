# Project Q&A

## Project Overview

NeoMatrix Frame Creator is a browser-based visual editor for designing LED matrix animations. It allows users to click on a grid to define pixel patterns, manage multiple animation frames, preview scrolling animations, and export the designs as JSON data or ready-to-compile Rust code. I built this tool for the University of Florida's CEN4907C Computer Engineering Design 1 course, specifically to help students working with WS2812 (NeoPixel) LED matrices in their embedded Rust projects.

**Problem Solved**: Manually calculating LED coordinates for matrix animations is tedious and error-prone. This tool provides immediate visual feedback and generates the exact code format students need.

**Target Users**: Computer engineering students, hobbyists working with LED matrices, and anyone building NeoPixel/WS2812 projects who wants a visual design tool.

## Key Features

### Dynamic Grid System
Users can set any grid size from 1x1 to 64x64, matching their physical LED matrix dimensions. The grid renders dynamically using CSS Grid, with each cell becoming a clickable button.

### Multi-Frame Animation Support
Create unlimited animation frames and navigate between them. Each frame maintains its own coordinate set independently, enabling complex multi-frame animations.

### Orientation Control
LED matrices can be wired with the origin (0,0) in any corner. I implemented four orientation modes (top-left, top-right, bottom-left, bottom-right) so the visual editor matches the user's physical hardware wiring.

### Real-Time Scrolling Preview
The "Play" button simulates how frames will scroll across the LED matrix. This uses a "megaframe" approach where all frames are concatenated and animated with configurable delay timing.

### Multi-Format Export
- **JSON**: Structured data for custom parsing
- **Clipboard Copy**: Quick paste into other applications
- **Rust Code Generation**: Complete `.rs` file with `NmScroll` struct, static frame arrays, and animation logic

### Visual Feedback
Clicked cells highlight in green, the origin corner is marked with a dashed border and dot, and coordinates display in real-time below the grid.

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

**Solution**: Instead of moving elements, I toggle CSS classes. The browser's style recalculation is highly optimized for class changes, keeping animations smooth even on larger grids.

### Innovative Approach: Zero-Dependency Architecture
I intentionally avoided all external dependencies. This eliminates supply chain risks, ensures the tool works indefinitely without maintenance, and allows instant forking/modification by students.

## Frequently Asked Questions

### Q: Why did you build this instead of using existing LED matrix editors?
**A**: Existing tools either export to formats incompatible with our Rust codebase or require installation. I needed a browser-based tool that generates Rust code matching our specific `NmScroll` struct interface used in the course project.

### Q: Can this tool work with non-square matrices?
**A**: Currently, the tool assumes square grids (N x N). Supporting rectangular matrices would require modifying `createGrid()` to accept separate width/height parameters and updating the coordinate mapping functions. This is a known limitation I may address in a future update.

### Q: Why Rust code output instead of C/C++ for Arduino?
**A**: The UF CEN4907C course uses embedded Rust with the `smart_leds` crate. The generated code integrates directly with that ecosystem. Adding C/Arduino export would be straightforward but wasn't needed for our use case.

### Q: How do I use the exported Rust code?
**A**: Download the `.rs` file, add it to your Rust project's `src/` directory, and import the `NmScroll` struct. Call `new()` with your desired color, then `next()` in your main loop to advance the animation. The `to_list()` method returns the pixel array to send to your LED strip.

### Q: Why doesn't the tool save my work between sessions?
**A**: By design. The intended workflow is: open tool, design frames, export code, close browser. Adding persistence would complicate the mental model and code. If you need to save work-in-progress, use the JSON export and re-import later (import functionality could be a future enhancement).

### Q: Can I contribute to this project?
**A**: Yes. The repository is public on GitHub. Since there's no build system, just fork, edit the HTML/CSS/JS files directly, and submit a pull request. No npm install or toolchain setup required.

### Q: How accurate is the scrolling preview compared to real hardware?
**A**: The preview shows the same pixels that will light up on hardware, but timing may differ. Browser `setInterval` isn't perfectly precise, and your embedded system's loop timing varies. Use the preview for visual verification, then tune delay values on actual hardware.

### Q: Why is there no color picker?
**A**: The preview uses a single green color for simplicity. In the generated Rust code, you pass any `RGB8` color to the `new()` constructor. Adding a color picker to the UI would be nice but wasn't essential for the course project's needs.

### Q: What happens if I set a very large grid size?
**A**: The tool allows up to 64x64 (4,096 cells). Performance remains acceptable, but the cells become small. For very large matrices, consider using the tool to design smaller sprites and tiling them in code.

### Q: Is there mobile support?
**A**: The tool works on mobile browsers but the experience is suboptimal. The grid cells are sized for mouse interaction. Touch targets are technically usable but cramped on phone screens. A tablet works reasonably well.
