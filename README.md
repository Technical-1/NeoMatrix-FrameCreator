# NeoMatrix Frame Creator

[![Live Demo](https://img.shields.io/badge/demo-live-00f0ff?style=flat-square)](https://technical-1.github.io/NeoMatrix-FrameCreator/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

A web-based visual editor for designing LED matrix animations for WS2812 (NeoPixel) LED displays. Create multi-color pixel art, preview scrolling animations, and export to Rust code or animated GIF.

![NeoMatrix Frame Creator Preview](og-image.png)

[**Try it live →**](https://technical-1.github.io/NeoMatrix-FrameCreator/)

---

## Features

### Core Editing
- **Dynamic Grid Size** — Support for rectangular grids from 1×1 to 64×64; resizing keeps the pixels that still fit
- **Click-and-Drag Painting** — Paint or erase across many cells in one mouse/touch stroke, collapsed into a single undo step
- **Multi-Color Support** — Each pixel can have its own color with live color picker
- **Multiple Frames** — Create unlimited animation frames with drag-and-drop reordering
- **Undo/Redo** — 50-step history with Ctrl+Z / Ctrl+Y keyboard shortcuts
- **Autosave** — Work is automatically saved to localStorage every 30 seconds

### Animation
- **Scrolling Preview** — Watch your frames scroll across the grid in real-time
- **Adjustable Speed** — Control animation speed from 50ms to 2000ms per step
- **Orientation Modes** — Flip origin corner to match your physical matrix wiring; the drawing stays in place while the exported addressing follows the new origin

### Export Options
- **Rust Code** — Generate ready-to-compile `.rs` files with per-pixel RGB colors and animation speed
- **Animated GIF** — Export high-quality GIF animations with LED glow effects
- **JSON/CSV** — Download structured data for use in other applications
- **"Finished" Modal** — View complete Rust code with stats, copy to clipboard, or download

---

## How to Use

1. **Open the Tool**
   Go to [**NeoMatrix Frame Creator**](https://technical-1.github.io/NeoMatrix-FrameCreator/)

2. **Set Up Your Grid**
   - Set **Width** and **Height** for your matrix dimensions
   - Choose **Orientation** to match your LED wiring (top-left, top-right, etc.)
   - Select a **Color** using the color picker

3. **Create Frames**
   - Click or drag across cells to paint pixels; the first cell in a stroke decides whether you're painting or erasing
   - Click a lit pixel with the same color to turn it off, or with a different color to change it
   - Use **New Frame**, **Duplicate**, and **Delete** to manage frames
   - Drag and drop frame thumbnails to reorder

4. **Preview Animation**
   - Set **Speed** (milliseconds per scroll step)
   - Click **Play** to watch your frames scroll across the grid
   - Click **Stop** to end the preview

5. **Export Your Work**
   - **JSON** — Save all frames with coordinates and colors
   - **CSV** — Export as spreadsheet-compatible format
   - **GIF** — Download animated GIF with LED glow effects
   - **Rust** — Download `.rs` file ready for your embedded project
   - **Finished** — Open modal with complete Rust code, stats, and copy/download options

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+←` | Previous frame |
| `Ctrl+→` | Next frame |
| `Space` | Toggle cell (when focused) |
| `Escape` | Close modal |

---

## Generated Rust Code

The tool generates complete Rust code compatible with the `smart_leds` crate. Example output:

```rust
use smart_leds::RGB8;

pub const WIDTH: usize = 8;
pub const HEIGHT: usize = 8;
pub const SCROLL_DELAY_MS: u32 = 200;

/// Pixel data: (x, y, r, g, b)
type Pixel = (usize, usize, u8, u8, u8);

pub struct NmScroll {
    strip: [RGB8; WIDTH * HEIGHT],
    frame: isize,
}

impl NmScroll {
    pub fn new() -> Self {
        Self {
            strip: [RGB8::new(0, 0, 0); WIDTH * HEIGHT],
            frame: 0,
        }
    }

    /// Get the recommended delay between scroll steps
    pub fn delay_ms() -> u32 {
        SCROLL_DELAY_MS
    }

    // Frame data with per-pixel RGB colors
    const FRAME_1: &'static [Pixel] = &[
        (0, 0, 0, 240, 255),   // Cyan pixel at (0,0)
        (1, 0, 255, 0, 170),   // Magenta pixel at (1,0)
        // ...
    ];

    pub fn next(&mut self) {
        // Scrolling animation logic
    }
}
```

Use `NmScroll::delay_ms()` in your main loop:

```rust
loop {
    animation.next();
    ws.write(animation.to_list().iter().cloned()).unwrap();
    delay.delay_ms(NmScroll::delay_ms());
}
```

---

## Development

The shipped app has **zero runtime dependencies** — vanilla HTML/CSS/JS, no build step. Editing is "open and refresh":

```bash
# Clone the repository
git clone https://github.com/Technical-1/NeoMatrix-FrameCreator.git
cd NeoMatrix-FrameCreator

# Open the landing page in a browser, or app.html to go straight to the editor
open index.html   # landing page
open app.html     # editor directly
# Or use a local server
python -m http.server 8000
```

### Testing

Non-DOM logic lives in `lib.js` and is unit-tested directly; DOM behaviour is covered by jsdom integration tests. The only dev dependencies are `jsdom` and `canvas` (test-time only):

```bash
npm install   # installs jsdom + canvas
npm test      # node:test suite — 74 tests across 12 files
```

New pure logic should go in `lib.js` with a matching test rather than inline in `script.js`.

### Project Structure

```
├── index.html            # Home/about landing page (redirects returning visitors to the editor)
├── app.html              # The editor (formerly index.html)
├── style.css             # Dark neon theme (~1340 lines)
├── script.js             # DOM/UI application logic (~1660 lines)
├── lib.js                # DOM-free pure logic (geometry, GIF encoding, validation)
├── tests/                # node:test unit + jsdom integration tests
├── favicon.svg           # SVG favicon
├── og-image.png          # Social media preview image (1200×630)
├── og-image.svg          # SVG source for OG image
├── apple-touch-icon.png  # iOS home screen icon
├── generate-pngs.js      # Node.js script for PNG asset generation
├── generate-assets.html  # Browser-based asset generator
├── package.json          # Dev dependencies (jsdom, canvas) + test script
├── LICENSE               # MIT
└── .portfolio/           # Project documentation
```

### Regenerating Assets

```bash
npm install
node generate-pngs.js
```

---

## Credits

Originally designed for the final project in the University of Florida class CEN4907C (Computer Engineering Design 1) for WS2812 LED matrix projects.


