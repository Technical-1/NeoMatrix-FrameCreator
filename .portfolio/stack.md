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

2. **Instant Deployment**: The entire application is three files. Drop them on any web server or use GitHub Pages.

3. **Appropriate Scope**: This is a focused, single-purpose tool. A framework would add overhead without proportional benefit.

4. **Educational Value**: As a university project tool, vanilla JavaScript helps students understand DOM manipulation fundamentals before abstracting them away with frameworks.

## Backend

**None** - This is a purely client-side application. All processing happens in the browser.

### Why No Backend?

- Frame data is transient by design (create, export, use)
- No user accounts or persistent storage needed
- Eliminates hosting costs and complexity
- Works offline once loaded

## Database

**None** - Data is stored in JavaScript memory during the session.

### Data Structure

```javascript
let frames = [
  {
    coords: [{ row: 0, col: 1 }, { row: 0, col: 2 }],
    name: "Frame 1"
  }
];
```

I considered localStorage for session persistence but decided against it. The workflow is: design frames, export code, close browser. Persistence would add complexity without matching the use case.

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

## Key Dependencies

**None** - This project has zero external dependencies.

### Why Zero Dependencies?

1. **Security**: No supply chain attack vectors
2. **Longevity**: No risk of abandoned packages breaking the build
3. **Simplicity**: No `node_modules`, no `package.json`, no version conflicts
4. **Performance**: No library code to download or parse

### What I Wrote Instead of Using Libraries

| Common Library | My Implementation |
|----------------|-------------------|
| jQuery | Native `document.querySelector`, `addEventListener` |
| Lodash | Native array methods (`map`, `filter`, `forEach`) |
| FileSaver.js | Native Blob API with `URL.createObjectURL` |
| Clipboard.js | Native `navigator.clipboard.writeText` |

## Browser Compatibility

The application uses modern JavaScript features:
- `let`/`const` declarations
- Arrow functions
- Template literals
- `navigator.clipboard` API
- CSS Grid

**Supported Browsers**: Chrome 66+, Firefox 63+, Safari 13.1+, Edge 79+

I did not include polyfills for older browsers. The target audience (engineering students) uses modern browsers, and polyfills would add complexity for minimal benefit.

## Development Tools

| Tool | Purpose |
|------|---------|
| Any text editor | Code editing (VS Code recommended) |
| Any modern browser | Testing and debugging |
| Git | Version control |
| GitHub | Repository hosting and deployment |

No special tooling required. This intentional simplicity means anyone can contribute without environment setup friction.
