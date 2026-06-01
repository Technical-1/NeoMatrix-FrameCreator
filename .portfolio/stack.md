# Technology Stack

## Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| HTML5 | - | Document structure and semantic markup |
| CSS3 | - | Styling, responsive layout, grid system |
| JavaScript (ES6+) | - | Application logic, DOM manipulation, code generation |

### Why Vanilla JavaScript?

I deliberately chose not to use any frontend framework (React, Vue, Angular, etc.) for several reasons:

1. **Zero Build Complexity**: No webpack, no Babel, no npm scripts. Users can fork the repo and immediately start modifying.

2. **Instant Deployment**: The entire application is a handful of static files (two HTML pages, one stylesheet, two scripts). Drop them on any web server or use GitHub Pages.

3. **Appropriate Scope**: This is a focused, single-purpose tool. A framework would add overhead without proportional benefit.

4. **Educational Value**: As a university project tool, vanilla JavaScript helps students understand DOM manipulation fundamentals before abstracting them away with frameworks.

## Backend

**None** - This is a purely client-side application. All processing happens in the browser.

### Why No Backend?

- Frame data is transient by design (create, export, use)
- No user accounts or persistent storage needed
- Eliminates hosting costs and complexity
- Works offline once loaded

## Persistence

**localStorage** — All state is automatically saved to `localStorage` every 30 seconds and on page unload, then restored on next visit.

### Data Structure

```javascript
let frames = [
  {
    coords: [{ row: 0, col: 1, color: "#00f0ff" }, { row: 0, col: 2, color: "#ff00aa" }],
    name: "Frame 1"
  }
];
```

Each pixel stores its own color, enabling multi-color designs within a single frame. The autosave system persists grid dimensions, orientation, LED color, animation speed, frame data, and current frame index.

## Infrastructure & Deployment

| Component | Technology | Notes |
|-----------|------------|-------|
| Hosting | GitHub Pages | Free, automatic deployment from main branch |
| CDN | GitHub's CDN | Comes with GitHub Pages |
| SSL | GitHub-provided | HTTPS by default |
| Domain | github.io subdomain | `technical-1.github.io/NeoMatrix-FrameCreator/` |

### Deployment Process

1. Push to `main` branch
2. GitHub Pages automatically deploys
3. No CI/CD pipeline needed (no build step)

## Architecture: Pure-Logic Library + DOM Layer

The non-trivial logic is split out of the UI into `lib.js`, a **DOM-free** module: coordinate geometry, import validation/clamping, GIF palette and LZW encoding, megaframe layout, GIF export sizing, the pixel-preserving reorient/resize transforms, and the first-visit landing-page redirect decision (`shouldRedirectHome`). It attaches to `window` in the browser and is `require()`-d directly by the Node test suite. The DOM/UI glue lives in `script.js`. This split is what makes a zero-build, browser-only app genuinely testable.

## Testing

| Tool | Version | Purpose |
|------|---------|---------|
| `node:test` | Node 18+ built-in | Test runner (`npm test`), zero extra runtime deps |
| `jsdom` | ^29.1.1 (dev) | Headless DOM for integration tests of real handlers |
| `canvas` | ^3.2.1 (dev) | Backs the Canvas 2D API in GIF render tests + asset gen |

The suite is **82 tests across 14 files**: pure-logic units (geometry round-trips, palette overflow past 256 colors, malformed-autosave clamping, out-of-bounds import trimming, reorient/resize, first-visit redirect rule) plus jsdom integration tests that drive the actual DOM event handlers.

## Key Dependencies

**Zero runtime dependencies** — The shipped application has no external dependencies. The only dev dependencies are `jsdom` (^29.1.1) and `canvas` (^3.2.1): `jsdom` powers the DOM integration tests, and `canvas` backs the Canvas API in tests and `generate-pngs.js` server-side PNG asset generation (favicons, OG images).

### Why Zero Runtime Dependencies?

1. **Security**: No supply chain attack vectors in production
2. **Longevity**: No risk of abandoned packages breaking the build
3. **Simplicity**: No bundler, no transpiler, no version conflicts
4. **Performance**: No library code to download or parse

### What I Wrote Instead of Using Libraries

| Common Library | My Implementation |
|----------------|-------------------|
| jQuery | Native `document.querySelector`, `addEventListener` |
| Lodash | Native array methods (`map`, `filter`, `forEach`) |
| FileSaver.js | Native Blob API with `URL.createObjectURL` |
| Clipboard.js | Native `navigator.clipboard.writeText` |
| gif.js / gifenc | Custom `GifEncoder` (`script.js`) + palette/LZW encoding in `lib.js`, capped at 256 colors |

## Browser Compatibility

The application uses modern JavaScript features:
- `let`/`const` declarations
- Arrow functions
- Template literals
- `navigator.clipboard` API
- CSS Grid and CSS custom properties (dynamic per-pixel colors)
- Canvas 2D API (GIF rendering)
- localStorage API (autosave)
- FileReader API (JSON import)
- HTML5 Drag and Drop API (frame reordering)
- Blob/URL.createObjectURL (file downloads)

**Supported Browsers**: Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+

I did not include polyfills for older browsers. The target audience (engineering students) uses modern browsers, and polyfills would add complexity for minimal benefit.

## Development Tools

| Tool | Purpose |
|------|---------|
| Any text editor | Code editing (VS Code recommended) |
| Any modern browser | Manual testing and debugging |
| Node.js + `npm test` | Running the automated `node:test` suite (dev only) |
| Git | Version control |
| GitHub | Repository hosting and deployment |

Editing the app itself needs no toolchain — open `app.html` (the editor) or `index.html` (the landing page) and refresh. Node is only required to run the test suite (`npm install` once for the `jsdom`/`canvas` dev dependencies, then `npm test`), so contributors can iterate on the UI without any setup friction.
