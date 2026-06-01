# Home / About Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a story-first landing page (`index.html`) that explains the UF CEN4907C senior-design origin and hands off to the editor (now `app.html`), shown on first visit only.

**Architecture:** The current editor `index.html` is renamed verbatim to `app.html` (its JS/CSS are unchanged). A new `index.html` becomes the home page: a tiny inline redirect (backed by a pure `shouldRedirectHome()` helper in `lib.js`) sends *returning* visitors straight to `app.html`, while first-time visitors read the story and click "Launch editor →". The editor marks the visitor as seen via a `neomatrix-visited` localStorage flag and gains an "About" header link back to `index.html?home=1`.

**Tech Stack:** Vanilla JS (zero-build static site), `node:test` unit tests, jsdom DOM tests, GitHub Pages deploy.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `lib.js` | Modify | Add + export pure `shouldRedirectHome(hasVisited, search)` |
| `tests/redirect.test.js` | Create | Unit tests for `shouldRedirectHome` |
| `index.html` | Rename → `app.html` | The editor (unchanged markup, then small additions) |
| `app.html` | Modify | Editor-focused canonical meta, flag-on-load script, About link |
| `tests/dom.test.js` | Modify (line 15) | Load `app.html` instead of `index.html` |
| `index.html` | Create (new) | Home/about landing page + redirect + Launch link |
| `tests/home.test.js` | Create | Contract test: launch link → app.html; About link → `index.html?home=1` |
| `style.css` | Modify (append) | `home-*` landing-page styles |
| `CLAUDE.md`, `README.md` | Modify | Update file references (index.html is now the home page) |

---

## Task 1: Pure redirect helper in `lib.js`

**Files:**
- Modify: `lib.js` (add function + add name to the returned export object near end of file)
- Test: `tests/redirect.test.js`

- [ ] **Step 1: Write the failing test**

Create `tests/redirect.test.js`:

```js
const test = require('node:test');
const assert = require('node:assert');
const { shouldRedirectHome } = require('../lib.js');

test('first visit (no flag) stays on the home page', () => {
    assert.strictEqual(shouldRedirectHome(null, ''), false);
    assert.strictEqual(shouldRedirectHome(undefined, ''), false);
    assert.strictEqual(shouldRedirectHome('', ''), false);
});

test('returning visitor with no ?home is redirected to the editor', () => {
    assert.strictEqual(shouldRedirectHome('1', ''), true);
    assert.strictEqual(shouldRedirectHome('1', '?foo=bar'), true);
});

test('returning visitor with ?home stays on the home page', () => {
    assert.strictEqual(shouldRedirectHome('1', '?home'), false);
    assert.strictEqual(shouldRedirectHome('1', '?home=1'), false);
    assert.strictEqual(shouldRedirectHome('1', '?x=1&home=1'), false);
});

test('handles missing/undefined search safely', () => {
    assert.strictEqual(shouldRedirectHome('1', undefined), true);
    assert.strictEqual(shouldRedirectHome('1', null), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/redirect.test.js`
Expected: FAIL — `shouldRedirectHome is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `lib.js`, add this function inside the factory (e.g. just above `const VERSION = '1.0.1';`):

```js
    // Returns true when a visitor who has already seen the home page should be
    // sent straight to the editor. `?home` anywhere in the query string forces
    // the home page to stay (lets the story be revisited on demand).
    function shouldRedirectHome(hasVisited, search) {
        return Boolean(hasVisited) && !String(search || '').includes('home');
    }
```

Then add `shouldRedirectHome` to the returned object at the bottom of `lib.js`. Change:

```js
    return { VERSION, sanitizeFrameName, nonEmptyFrames, clampFramesToGrid, reorientFrames, indexToRowCol, rowColToIndex, isValidHexColor, normalizeColor, parseHexColor, resolveSpeedInput, planGifExport, clampDimension, validateImportedData, gifLzwEncode, buildGifPalette };
```

to:

```js
    return { VERSION, sanitizeFrameName, nonEmptyFrames, clampFramesToGrid, reorientFrames, indexToRowCol, rowColToIndex, isValidHexColor, normalizeColor, parseHexColor, resolveSpeedInput, planGifExport, clampDimension, validateImportedData, gifLzwEncode, buildGifPalette, shouldRedirectHome };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/redirect.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib.js tests/redirect.test.js
git commit -m "feat: add shouldRedirectHome helper for landing-page routing"
```

---

## Task 2: Rename editor to `app.html` and repoint the DOM test

**Files:**
- Rename: `index.html` → `app.html` (via `git mv`, content unchanged in this step)
- Modify: `tests/dom.test.js:15`

- [ ] **Step 1: Rename the editor file**

```bash
git mv index.html app.html
```

- [ ] **Step 2: Repoint the DOM test loader**

In `tests/dom.test.js`, change line 15 from:

```js
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
```

to:

```js
const html = fs.readFileSync(path.join(ROOT, 'app.html'), 'utf8');
```

- [ ] **Step 3: Run the full suite to verify it still passes**

Run: `npm test`
Expected: PASS — the entire existing suite is green; `dom.test.js` now loads the editor from `app.html`.

- [ ] **Step 4: Commit**

```bash
git add app.html tests/dom.test.js
git commit -m "refactor: move editor to app.html, repoint DOM test"
```

---

## Task 3: Editor (`app.html`) — canonical meta, visited flag, About link

**Files:**
- Modify: `app.html` (`<head>` canonical/og:url; add inline flag-set script before `</body>`; add About link in `.header-actions`)

- [ ] **Step 1: Update the editor's canonical + og:url to app.html**

In `app.html`, change these three lines so the editor points at its own URL (leave the og:image/favicon lines as-is):

```html
    <meta property="og:url" content="https://technical-1.github.io/NeoMatrix-FrameCreator/app.html">
```
```html
    <meta name="twitter:url" content="https://technical-1.github.io/NeoMatrix-FrameCreator/app.html">
```
```html
    <link rel="canonical" href="https://technical-1.github.io/NeoMatrix-FrameCreator/app.html">
```

- [ ] **Step 2: Add the "About" link to the editor header**

In `app.html`, inside `<div class="header-actions">`, add an About link as the FIRST child (just after the opening `<div class="header-actions">` line, before the undo button):

```html
                <a class="btn btn-icon home-link" href="index.html?home=1" aria-label="About this project" title="About">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                        <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                </a>
```

- [ ] **Step 3: Add the visited-flag script**

In `app.html`, immediately after the existing `<script src="script.js"></script>` line (just before `</body>`), add:

```html
    <script>
        // Anyone who reaches the editor has seen the intro; mark them so the
        // home page redirects them straight here next time.
        try { localStorage.setItem('neomatrix-visited', '1'); } catch (e) { /* storage blocked */ }
    </script>
```

- [ ] **Step 4: Verify the editor still loads and tests pass**

Run: `npm test`
Expected: PASS — `dom.test.js` (loading `app.html`) is still green; the new markup doesn't break init.

- [ ] **Step 5: Commit**

```bash
git add app.html
git commit -m "feat: editor canonical meta, visited flag, and About link"
```

---

## Task 4: Home page (`index.html`) + contract test

**Files:**
- Create: `index.html` (new home/landing page)
- Test: `tests/home.test.js`

- [ ] **Step 1: Write the failing contract test**

Create `tests/home.test.js`:

```js
// Contract test for the split between the home page (index.html) and the
// editor (app.html). jsdom parses the markup; we assert the wiring (links),
// not navigation side effects (runScripts is off, so inline scripts don't run).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
function dom(file) {
    return new JSDOM(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

test('home page Launch control navigates to the editor', () => {
    const d = dom('index.html');
    const launch = d.window.document.getElementById('launch-editor');
    assert.ok(launch, 'expected a #launch-editor element');
    assert.strictEqual(launch.getAttribute('href'), 'app.html');
});

test('home page loads lib.js and runs the redirect helper', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(html.includes('lib.js'), 'home page must load lib.js for the helper');
    assert.ok(html.includes('shouldRedirectHome'), 'home page must call shouldRedirectHome');
    assert.ok(html.includes("location.replace('app.html')"), 'home page must redirect to app.html');
});

test('editor exposes an About link back to the home story', () => {
    const d = dom('app.html');
    const about = d.window.document.querySelector('.header-actions a.home-link');
    assert.ok(about, 'expected an About link in the editor header');
    assert.strictEqual(about.getAttribute('href'), 'index.html?home=1');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/home.test.js`
Expected: FAIL — `index.html` does not exist yet / `#launch-editor` is null. (The editor/About assertion may already pass from Task 3.)

- [ ] **Step 3: Create the home page**

Create `index.html` with this complete content:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>NeoMatrix Frame Creator — LED Matrix Animation Designer</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- SEO -->
    <meta name="description" content="The story behind NeoMatrix Frame Creator — a browser tool for designing WS2812 LED matrix animations, born from a University of Florida senior design project.">
    <meta name="author" content="Technical-1">
    <meta name="robots" content="index, follow">
    <meta name="theme-color" content="#0a0a0f">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://technical-1.github.io/NeoMatrix-FrameCreator/">
    <meta property="og:title" content="NeoMatrix Frame Creator">
    <meta property="og:description" content="Design LED matrix animations for WS2812 NeoPixel displays — built for UF senior design.">
    <meta property="og:image" content="https://technical-1.github.io/NeoMatrix-FrameCreator/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="NeoMatrix Frame Creator">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="NeoMatrix Frame Creator">
    <meta name="twitter:description" content="Design LED matrix animations for WS2812 NeoPixel displays — built for UF senior design.">
    <meta name="twitter:image" content="https://technical-1.github.io/NeoMatrix-FrameCreator/og-image.png">

    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="favicon.svg">
    <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
    <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

    <link rel="canonical" href="https://technical-1.github.io/NeoMatrix-FrameCreator/">
    <link rel="stylesheet" href="style.css">

    <!-- Returning visitors skip the story and go straight to the editor. -->
    <script src="lib.js"></script>
    <script>
        try {
            if (typeof shouldRedirectHome === 'function' &&
                shouldRedirectHome(localStorage.getItem('neomatrix-visited'), location.search)) {
                location.replace('app.html');
            }
        } catch (e) { /* storage blocked — just show the story */ }
    </script>
</head>
<body class="home-body">
    <main class="home">
        <section class="home-hero">
            <div class="home-grid-motif" aria-hidden="true">
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
                <span></span><span></span><span></span><span></span>
            </div>
            <h1 class="home-logo">NeoMatrix <span>Frame Creator</span></h1>
            <p class="home-tagline">Design LED matrix animations for WS2812 NeoPixel displays — paint frames, preview the scroll, and export ready-to-compile Rust.</p>
            <a class="home-launch" id="launch-editor" href="app.html">Launch editor →</a>
        </section>

        <section class="home-story">
            <h2>Why I built this</h2>
            <p>Built for senior design at the University of Florida (CEN4907C). Our project was a Rust-programmed microprocessor that detected which of four directions it was being leaned. I wanted it to play animations on an LED matrix — and quickly got tired of hand-writing pixel coordinates into Rust arrays.</p>
            <p>The first version of this tool existed for exactly one reason: so I never had to type a <code>(row, col)</code> by hand again. It grew into a full frame editor with scrolling preview, GIF export, and one-click Rust codegen.</p>
        </section>

        <section class="home-features">
            <h2>What it does</h2>
            <div class="home-feature-grid">
                <article class="home-feature">
                    <h3>Paint frames</h3>
                    <p>Click and drag to light pixels in any color across a grid up to 64×64.</p>
                </article>
                <article class="home-feature">
                    <h3>Preview the scroll</h3>
                    <p>Chain frames into a continuous horizontal scroll and watch it animate live.</p>
                </article>
                <article class="home-feature">
                    <h3>Export a GIF</h3>
                    <p>Render the animation to a looping GIF to share or drop in a README.</p>
                </article>
                <article class="home-feature">
                    <h3>Generate Rust</h3>
                    <p>Emit a ready-to-compile <code>.rs</code> file for the <code>smart_leds</code> crate.</p>
                </article>
            </div>
        </section>

        <footer class="home-footer">
            <a class="home-launch home-launch-secondary" href="app.html">Open the editor →</a>
            <p>by Jacob Kanfer · <a href="https://github.com/Technical-1/NeoMatrix-FrameCreator" target="_blank" rel="noopener">GitHub</a></p>
        </footer>
    </main>
</body>
</html>
```

Note: the `#launch-editor` link is a plain `<a href="app.html">`; the visited flag is set by `app.html` on load (Task 3), so no JS is needed on the link.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/home.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — entire suite green.

- [ ] **Step 6: Commit**

```bash
git add index.html tests/home.test.js
git commit -m "feat: add home/about landing page with first-visit redirect"
```

---

## Task 5: Home page styles in `style.css`

**Files:**
- Modify: `style.css` (append a `home-*` section at the end of the file)

- [ ] **Step 1: Append the home styles**

Add to the END of `style.css`:

```css
/* ============================================
   Home / About landing page
   ============================================ */

.home-body {
    min-height: 100vh;
    background:
        radial-gradient(circle at 20% 0%, rgba(0, 240, 255, 0.08), transparent 40%),
        radial-gradient(circle at 80% 100%, rgba(255, 0, 170, 0.08), transparent 40%),
        var(--bg-primary);
}

.home {
    max-width: 880px;
    margin: 0 auto;
    padding: var(--space-2xl) var(--space-lg);
}

.home-hero {
    text-align: center;
    padding: var(--space-2xl) 0 var(--space-xl);
}

.home-grid-motif {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--cell-gap);
    width: 132px;
    margin: 0 auto var(--space-lg);
}
.home-grid-motif span {
    aspect-ratio: 1;
    border-radius: 4px;
    background: var(--cell-off);
    border: 1px solid var(--cell-off-border);
    animation: home-pulse 2.4s ease-in-out infinite;
}
.home-grid-motif span:nth-child(3n)   { animation-delay: 0.2s;  background: var(--cell-off); }
.home-grid-motif span:nth-child(4n+1) { animation-delay: 0.6s; }
.home-grid-motif span:nth-child(2n)   { animation-delay: 1s; }
@keyframes home-pulse {
    0%, 100% { background: var(--cell-off); box-shadow: none; }
    50%      { background: var(--neon-cyan); box-shadow: 0 0 8px var(--neon-cyan-glow); }
}

.home-logo {
    font-family: 'Orbitron', sans-serif;
    font-weight: 700;
    font-size: clamp(2rem, 6vw, 3.25rem);
    color: var(--neon-cyan);
    text-shadow: 0 0 18px var(--neon-cyan-glow);
    margin: 0 0 var(--space-md);
    line-height: 1.1;
}
.home-logo span { color: var(--text-primary); text-shadow: none; }

.home-tagline {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-secondary);
    max-width: 36rem;
    margin: 0 auto var(--space-xl);
    line-height: 1.6;
}

.home-launch {
    display: inline-block;
    font-family: 'Orbitron', sans-serif;
    font-weight: 500;
    text-decoration: none;
    color: var(--bg-primary);
    background: var(--neon-cyan);
    padding: var(--space-md) var(--space-xl);
    border-radius: 8px;
    box-shadow: 0 0 24px var(--neon-cyan-glow);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.home-launch:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 36px var(--neon-cyan-glow);
}
.home-launch:focus-visible {
    outline: 2px solid var(--neon-magenta);
    outline-offset: 3px;
}
.home-launch-secondary {
    background: transparent;
    color: var(--neon-cyan);
    border: 1px solid var(--neon-cyan-dim);
    box-shadow: none;
}
.home-launch-secondary:hover { box-shadow: 0 0 20px var(--neon-cyan-glow); }

.home-story, .home-features {
    margin-top: var(--space-2xl);
}
.home-story h2, .home-features h2 {
    font-family: 'Orbitron', sans-serif;
    color: var(--neon-magenta);
    font-size: 1.4rem;
    margin-bottom: var(--space-md);
}
.home-story p {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-secondary);
    line-height: 1.75;
    margin-bottom: var(--space-md);
}
.home-story code, .home-feature code {
    color: var(--neon-green);
    background: var(--bg-surface);
    padding: 0.1em 0.35em;
    border-radius: 4px;
}

.home-feature-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-md);
}
.home-feature {
    background: var(--bg-surface);
    border: 1px solid var(--cell-off-border);
    border-radius: 10px;
    padding: var(--space-lg);
}
.home-feature h3 {
    font-family: 'Orbitron', sans-serif;
    color: var(--neon-cyan);
    font-size: 1rem;
    margin-bottom: var(--space-sm);
}
.home-feature p {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-secondary);
    font-size: 0.9rem;
    line-height: 1.6;
}

.home-footer {
    text-align: center;
    margin-top: var(--space-2xl);
    padding-top: var(--space-xl);
    border-top: 1px solid var(--cell-off-border);
}
.home-footer p {
    font-family: 'JetBrains Mono', monospace;
    color: var(--text-muted);
    margin-top: var(--space-lg);
}
.home-footer a { color: var(--neon-cyan); }

@media (prefers-reduced-motion: reduce) {
    .home-grid-motif span { animation: none; }
}
```

- [ ] **Step 2: Verify nothing broke**

Run: `npm test`
Expected: PASS — CSS is not executed by tests; the suite stays green. (CSS append cannot break JS tests; this step is a guard.)

- [ ] **Step 3: Manual visual check**

Open `index.html` in a browser. Confirm: the story renders with the neon theme, the motif pulses (and is static under OS "reduce motion"), and **Launch editor →** navigates to the editor. Reload the editor, return to `index.html` — you should be redirected to `app.html`. Visit `index.html?home=1` — the story shows.

- [ ] **Step 4: Commit**

```bash
git add style.css
git commit -m "style: add neon landing-page styles for the home page"
```

---

## Task 6: Update documentation references

**Files:**
- Modify: `CLAUDE.md` (Architecture section — `index.html` now describes the home page; the editor is `app.html`)
- Modify: `README.md` (add a one-line note that the root is the story page and the editor lives at `app.html`)

- [ ] **Step 1: Update `CLAUDE.md` architecture bullets**

In `CLAUDE.md`, under "## Architecture", replace the `index.html` bullet:

```
- `index.html` - Semantic HTML5 structure with ARIA accessibility
```

with:

```
- `index.html` - Home/about landing page (origin story); redirects returning visitors to the editor on first-visit-only logic via `shouldRedirectHome` (`lib.js`)
- `app.html` - The editor: semantic HTML5 structure with ARIA accessibility (formerly `index.html`)
```

- [ ] **Step 2: Note the new helper in the `lib.js` description**

In `CLAUDE.md`, in the `lib.js` architecture bullet, append `, landing-page redirect logic` to its list of responsibilities so `shouldRedirectHome` is documented.

- [ ] **Step 3: Update `README.md`**

In `README.md`, find where local development / opening the app is described and update it to: open `index.html` for the landing page or `app.html` to go straight to the editor. (Match the README's existing wording/section; keep it to one or two sentences.)

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS (docs-only change; suite stays green).

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: document home page split and shouldRedirectHome"
```

---

## Self-Review notes

- **Spec coverage:** Architecture/file split (Tasks 2–4), first-visit redirect helper + inline script (Tasks 1, 4), visited flag set by editor (Task 3), About link back to story (Task 3), home content sections — hero/story/features/footer (Task 4), neon design-system reuse + reduced-motion (Task 5), repointed DOM test + new redirect/contract tests (Tasks 1, 2, 4), docs (Task 6). All spec sections map to a task.
- **No placeholders:** every code/markup/CSS block is complete and ready to paste.
- **Type/name consistency:** `shouldRedirectHome(hasVisited, search)`, the `neomatrix-visited` flag key, the `#launch-editor` id, the `.home-link` editor class, and `app.html` / `index.html?home=1` URLs are used identically across `lib.js`, `index.html`, `app.html`, and all three tests.
