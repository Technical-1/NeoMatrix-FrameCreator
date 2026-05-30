# NeoMatrix Frame Creator — Bug-Fix Buckets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 7 investigation findings (2 high, 3 medium, 2 low) and establish a zero-dependency automated test suite for the pure logic.

**Architecture:** Extract the project's pure, DOM-free logic (coordinate geometry, import validation, colour parsing, GIF LZW compression, frame-name sanitisation) into a new `lib.js` exposed via a UMD shim — loadable as a browser `<script>` *and* `require()`-able by Node. `script.js` consumes those functions as globals. Behavioural DOM bugs (double-init, render caching) are fixed in `script.js` and verified manually. Tests run on Node 25's built-in `node:test` runner — no new dependencies.

**Tech Stack:** Vanilla ES (no build), Node 25 built-in test runner (`node --test`), existing `canvas` devDependency (unrelated to tests).

---

## File Structure

| File | Responsibility | Action |
|------|----------------|--------|
| `lib.js` | All pure, DOM-free logic (geometry, validation, colour, LZW, sanitisation). UMD: attaches to `window` in browser, `module.exports` in Node. | **Create** |
| `index.html` | Load `lib.js` before `script.js`. | Modify (`:358`) |
| `script.js` | App + DOM logic; delegates pure work to `lib.js` globals. | Modify (multiple sites) |
| `package.json` | `test` script → `node --test`. | Modify (`:7`) |
| `tests/geometry.test.js` | Round-trip + bounds + corner tests for orientation mapping. | Create |
| `tests/validation.test.js` | Import validation/clamping tests. | Create |
| `tests/color.test.js` | Hex colour validation/parse tests. | Create |
| `tests/gif-lzw.test.js` | LZW encode/decode round-trip incl. code-size boundary. | Create |
| `tests/rust.test.js` | Frame-name sanitisation tests. | Create |

**Bucket → Task map:** Task 0 = harness (unblocks A/C/D). Bucket A = Task 1. Bucket B = Task 2. Bucket C = Tasks 3–4. Bucket D = Tasks 5–6. Bucket E = Task 7.

**Suggested order:** 0 → 1 (A) → 2 (B) → 3,4 (C) → 5,6 (D) → 7 (E).

---

## Task 0: Test Harness Scaffold

Creates the UMD `lib.js` skeleton, wires it into the page, switches the test script to Node's runner, and proves the loop works with one trivial test.

**Files:**
- Create: `lib.js`
- Modify: `index.html:358`
- Modify: `package.json:7`
- Test: `tests/smoke.test.js` (temporary, deleted at end of task)

- [ ] **Step 1: Create `lib.js` UMD skeleton**

```javascript
/**
 * NeoMatrix Frame Creator — pure logic library.
 * DOM-free. Loaded as a browser <script> (attaches to window) and require()-d by Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;          // Node / tests
    } else {
        Object.assign(root, api);      // Browser: expose as globals on window
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- functions are added here in later tasks ---

    const VERSION = '1.0.0';

    return { VERSION };
});
```

- [ ] **Step 2: Add a temporary smoke test**

Create `tests/smoke.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const lib = require('../lib.js');

test('lib.js loads in Node and exports an object', () => {
    assert.strictEqual(typeof lib, 'object');
    assert.strictEqual(lib.VERSION, '1.0.0');
});
```

- [ ] **Step 3: Point the test script at Node's runner**

In `package.json`, replace line 7:

```json
    "test": "node --test"
```

- [ ] **Step 4: Run the smoke test to verify the harness works**

Run: `npm test`
Expected: `tests 1`, `pass 1`, `fail 0`.

- [ ] **Step 5: Load `lib.js` before `script.js` in the page**

In `index.html`, replace line 358:

```html
    <script src="lib.js"></script>
    <script src="script.js"></script>
```

- [ ] **Step 6: Delete the temporary smoke test**

```bash
rm tests/smoke.test.js
```

- [ ] **Step 7: Commit**

```bash
git add lib.js index.html package.json
git commit -m "chore: add zero-dependency test harness and lib.js UMD shim"
```

---

## Task 1 (Bucket A): Coordinate System Correctness 🔴

`rowColToIndex()` is not the inverse of `indexToRowCol()` for any origin except `top-left`, scrambling pixels on every redraw. We move both functions into `lib.js`, make them parameter-driven, and redefine all four origins as **corner reflections** (clean involutions), replacing the original dimensionally-inconsistent rotation math.

> **Design note:** The original code attempted 90° rotations that swapped width/height and broke on rectangular grids. Since `updateOrientation()` already clears all frames when the origin changes (`script.js:415`), no coordinates persist across origins, so the only requirement is internal round-trip consistency. Reflections (which corner is logical `(0,0)`) satisfy that, keep the logical grid `H×W` for every origin, and match the physical "where is pixel 0 wired" meaning.

**Files:**
- Create (in `lib.js`): `indexToRowCol`, `rowColToIndex`
- Test: `tests/geometry.test.js`
- Modify: `script.js` — delete old functions (`:757-800`), update 5 call sites

- [ ] **Step 1: Write the failing geometry tests**

Create `tests/geometry.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { indexToRowCol, rowColToIndex } = require('../lib.js');

const ORIENTATIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const SIZES = [[8, 8], [5, 3], [3, 5], [1, 64], [64, 1], [16, 9]];

test('rowColToIndex is the exact inverse of indexToRowCol', () => {
    for (const orientation of ORIENTATIONS) {
        for (const [w, h] of SIZES) {
            for (let i = 0; i < w * h; i++) {
                const { row, col } = indexToRowCol(i, w, h, orientation);
                const back = rowColToIndex(row, col, w, h, orientation);
                assert.strictEqual(back, i,
                    `${orientation} ${w}x${h}: index ${i} -> (${row},${col}) -> ${back}`);
            }
        }
    }
});

test('indexToRowCol stays within logical bounds', () => {
    for (const orientation of ORIENTATIONS) {
        for (const [w, h] of SIZES) {
            for (let i = 0; i < w * h; i++) {
                const { row, col } = indexToRowCol(i, w, h, orientation);
                assert.ok(row >= 0 && row < h, `${orientation} ${w}x${h}: row ${row} OOB`);
                assert.ok(col >= 0 && col < w, `${orientation} ${w}x${h}: col ${col} OOB`);
            }
        }
    }
});

test('each origin maps logical (0,0) to the expected DOM corner', () => {
    const w = 4, h = 3;
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'top-left'), 0);
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'top-right'), w - 1);
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'bottom-left'), (h - 1) * w);
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'bottom-right'), w * h - 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/geometry.test.js`
Expected: FAIL — `indexToRowCol is not a function` (not yet in `lib.js`).

- [ ] **Step 3: Implement the corrected functions in `lib.js`**

Inside the `lib.js` factory, above `const VERSION`, add:

```javascript
    // --- Coordinate geometry (corner-reflection origins) ---

    function indexToRowCol(index, width, height, orientation) {
        const domRow = Math.floor(index / width);
        const domCol = index % width;
        switch (orientation) {
            case 'top-right':
                return { row: domRow, col: (width - 1) - domCol };
            case 'bottom-left':
                return { row: (height - 1) - domRow, col: domCol };
            case 'bottom-right':
                return { row: (height - 1) - domRow, col: (width - 1) - domCol };
            case 'top-left':
            default:
                return { row: domRow, col: domCol };
        }
    }

    function rowColToIndex(row, col, width, height, orientation) {
        let domRow, domCol;
        switch (orientation) {
            case 'top-right':
                domRow = row; domCol = (width - 1) - col; break;
            case 'bottom-left':
                domRow = (height - 1) - row; domCol = col; break;
            case 'bottom-right':
                domRow = (height - 1) - row; domCol = (width - 1) - col; break;
            case 'top-left':
            default:
                domRow = row; domCol = col; break;
        }
        return domRow * width + domCol;
    }
```

Add them to the returned object:

```javascript
    return { VERSION, indexToRowCol, rowColToIndex };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/geometry.test.js`
Expected: PASS — 3 tests, 0 fail.

- [ ] **Step 5: Delete the old functions from `script.js`**

Delete the entire `indexToRowCol` and `rowColToIndex` definitions at `script.js:757-800` (the two `function` blocks under the `Orientation Mapping` banner). Leave the banner comment.

- [ ] **Step 6: Update the 5 call sites in `script.js` to pass dimensions + orientation**

`script.js:358` (in `createGrid`):

```javascript
        const { row, col } = indexToRowCol(i, GRID_WIDTH, GRID_HEIGHT, gridOrientation);
```

`script.js:383` (in `handleCellClick`):

```javascript
    const { row, col } = indexToRowCol(index, GRID_WIDTH, GRID_HEIGHT, gridOrientation);
```

`script.js:475` (in `highlightCornerButton`):

```javascript
        const coords = indexToRowCol(i, GRID_WIDTH, GRID_HEIGHT, gridOrientation);
```

`script.js:597` (in `applyFrameToGrid`):

```javascript
        const idx = rowColToIndex(pt.row, pt.col, GRID_WIDTH, GRID_HEIGHT, gridOrientation);
```

`script.js:906` (in `renderMegaCoords`):

```javascript
            const idx = rowColToIndex(pt.row, shiftedCol, GRID_WIDTH, GRID_HEIGHT, gridOrientation);
```

- [ ] **Step 7: Manual browser verification**

Open `index.html`. For each of the four Origin buttons: draw a distinctive shape (e.g. an "L"), switch to another frame and back, and press Ctrl+Z/redo. Expected: the lit pixels return to the exact same cells every time (no scramble). Try a rectangular grid (e.g. 12×5) in each origin.

- [ ] **Step 8: Commit**

```bash
git add lib.js script.js tests/geometry.test.js
git commit -m "fix: make rowColToIndex a true inverse of indexToRowCol for all origins"
```

---

## Task 2 (Bucket B): App Lifecycle & Initialization 🔴

`initializeApp()` runs twice because the top-of-file `DOMContentLoaded` listener (`script.js:35-37`) and the bottom init block (`script.js:1658-1662`) both fire — the script is a non-deferred classic script, so it executes while `readyState === 'loading'`. This double-binds every listener (Ctrl+Z undoes twice, Space starts-then-stops scroll) and leaks two 30 s autosave intervals.

**Files:**
- Modify: `script.js:8-29` (add guard flag), `script.js:35-37` (delete top listener), `script.js:39` (guard body)

- [ ] **Step 1: Add an `appInitialized` guard flag**

In the state block, after `script.js:29` (`const STORAGE_KEY = 'neomatrix-autosave';`), add:

```javascript

// Guard against double-initialization (script is a non-deferred classic script)
let appInitialized = false;
```

- [ ] **Step 2: Delete the redundant top-of-file listener**

Delete `script.js:35-37`:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});
```

(Leave the `Initialization` banner comment at lines 31-33.)

- [ ] **Step 3: Make `initializeApp()` idempotent**

At the top of `initializeApp()` (currently `script.js:39`), insert the guard as the first lines of the body:

```javascript
function initializeApp() {
    if (appInitialized) return;
    appInitialized = true;

    // Try to load from localStorage
    loadFromStorage();
```

The bottom block (`script.js:1658-1662`) is the single remaining entry point and correctly handles both `loading` and already-parsed states — leave it unchanged.

- [ ] **Step 4: Manual verification — keyboard shortcuts fire once**

Open `index.html` (hard-refresh). Click two cells, then press Ctrl+Z **once**. Expected: exactly one cell is removed (one undo step), not two. Press Space once: the animation starts and keeps playing (it does not instantly stop).

- [ ] **Step 5: Manual verification — single autosave timer**

In DevTools console run `initializeApp()` manually; expected: returns immediately with no visible effect (guard works). Confirm via the Performance/Memory panel that only one `setInterval` is registered (or add a temporary `console.count('init')` and confirm it logs once on load, then remove it).

- [ ] **Step 6: Commit**

```bash
git add script.js
git commit -m "fix: prevent double-initialization that double-bound all event listeners"
```

---

## Task 3 (Bucket C): Import Validation 🟡

`handleImport()` accepts an empty `frames: []` array (then crashes on `frames[0].coords`) and applies imported grid dimensions without the 1–64 clamp (a `gridWidth: 5000` file freezes the browser). Add a pure `validateImportedData()` to `lib.js` and route import through it. Colour normalisation (Task 4) is reused here, so implement `normalizeColor` first within this task.

**Files:**
- Create (in `lib.js`): `clampDimension`, `isValidHexColor`, `normalizeColor`, `validateImportedData`
- Test: `tests/validation.test.js`
- Modify: `script.js:923-978` (`handleImport`)

- [ ] **Step 1: Write the failing validation tests**

Create `tests/validation.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { validateImportedData } = require('../lib.js');

const DEFAULTS = {
    gridWidth: 8, gridHeight: 8, orientation: 'top-left',
    ledColor: '#00f0ff', animationSpeed: 200
};

test('rejects an empty frames array', () => {
    assert.throws(() => validateImportedData({ frames: [] }, DEFAULTS), /non-empty/);
});

test('rejects missing frames', () => {
    assert.throws(() => validateImportedData({}, DEFAULTS), /frames/);
});

test('rejects non-object input', () => {
    assert.throws(() => validateImportedData(null, DEFAULTS), /Invalid/);
});

test('clamps oversized grid dimensions to 64', () => {
    const r = validateImportedData({ frames: [{ coords: [] }], gridWidth: 5000, gridHeight: 9000 }, DEFAULTS);
    assert.strictEqual(r.gridWidth, 64);
    assert.strictEqual(r.gridHeight, 64);
});

test('clamps undersized dimensions to 1', () => {
    const r = validateImportedData({ frames: [{ coords: [] }], gridWidth: 0, gridHeight: -3 }, DEFAULTS);
    assert.strictEqual(r.gridWidth, 1);
    assert.strictEqual(r.gridHeight, 1);
});

test('expands legacy gridSize into width and height', () => {
    const r = validateImportedData({ frames: [{ coords: [] }], gridSize: 10 }, DEFAULTS);
    assert.strictEqual(r.gridWidth, 10);
    assert.strictEqual(r.gridHeight, 10);
});

test('falls back an invalid orientation to the default', () => {
    const r = validateImportedData({ frames: [{ coords: [] }], orientation: 'sideways' }, DEFAULTS);
    assert.strictEqual(r.orientation, 'top-left');
});

test('clamps animation speed into [50, 2000]', () => {
    assert.strictEqual(validateImportedData({ frames: [{ coords: [] }], animationSpeed: 10 }, DEFAULTS).animationSpeed, 50);
    assert.strictEqual(validateImportedData({ frames: [{ coords: [] }], animationSpeed: 99999 }, DEFAULTS).animationSpeed, 2000);
});

test('drops coords with non-finite row/col', () => {
    const r = validateImportedData({ frames: [{ coords: [{ row: 0, col: 0 }, { row: 'x', col: 1 }, { col: 2 }] }] }, DEFAULTS);
    assert.strictEqual(r.frames[0].coords.length, 1);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/validation.test.js`
Expected: FAIL — `validateImportedData is not a function`.

- [ ] **Step 3: Implement validation helpers in `lib.js`**

Inside the factory, add (above `const VERSION`):

```javascript
    // --- Colour helpers (shared with Bucket D's parseHexColor) ---

    function isValidHexColor(hex) {
        return typeof hex === 'string' && /^#?[a-f\d]{6}$/i.test(hex);
    }

    function normalizeColor(hex, fallback) {
        if (!isValidHexColor(hex)) return fallback;
        return hex.charAt(0) === '#' ? hex : '#' + hex;
    }

    // --- Import validation ---

    function clampDimension(value, fallback) {
        const n = parseInt(value, 10);
        if (Number.isNaN(n)) return fallback;
        return Math.max(1, Math.min(64, n));
    }

    function validateImportedData(data, defaults) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid format: not an object');
        }
        if (!Array.isArray(data.frames) || data.frames.length === 0) {
            throw new Error('Invalid format: frames must be a non-empty array');
        }

        let width = defaults.gridWidth;
        let height = defaults.gridHeight;
        if (data.gridSize) { width = data.gridSize; height = data.gridSize; } // legacy square grids
        if (data.gridWidth) width = data.gridWidth;
        if (data.gridHeight) height = data.gridHeight;
        width = clampDimension(width, defaults.gridWidth);
        height = clampDimension(height, defaults.gridHeight);

        const validOrientations = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const orientation = validOrientations.includes(data.orientation)
            ? data.orientation : defaults.orientation;

        const ledColor = normalizeColor(data.ledColor, defaults.ledColor);

        let animationSpeed = parseInt(data.animationSpeed, 10);
        if (Number.isNaN(animationSpeed)) animationSpeed = defaults.animationSpeed;
        animationSpeed = Math.max(50, Math.min(2000, animationSpeed));

        const frames = data.frames.map((f, i) => ({
            name: typeof (f && f.name) === 'string' ? f.name : `Frame ${i + 1}`,
            coords: (Array.isArray(f && f.coords) ? f.coords : [])
                .filter(pt => pt && Number.isFinite(pt.row) && Number.isFinite(pt.col))
                .map(pt => ({ row: pt.row, col: pt.col, color: normalizeColor(pt.color, ledColor) }))
        }));

        return { gridWidth: width, gridHeight: height, orientation, ledColor, animationSpeed, frames };
    }
```

Extend the return object:

```javascript
    return {
        VERSION, indexToRowCol, rowColToIndex,
        isValidHexColor, normalizeColor, clampDimension, validateImportedData
    };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/validation.test.js`
Expected: PASS — 9 tests, 0 fail.

- [ ] **Step 5: Rewrite `handleImport()` in `script.js` to use the validator**

Replace the body of `handleImport` (`script.js:923-978`) — specifically the `reader.onload` handler — with:

```javascript
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            const normalized = validateImportedData(data, {
                gridWidth: GRID_WIDTH,
                gridHeight: GRID_HEIGHT,
                orientation: gridOrientation,
                ledColor: ledColor,
                animationSpeed: animationSpeed
            });

            saveState();

            GRID_WIDTH = normalized.gridWidth;
            GRID_HEIGHT = normalized.gridHeight;
            gridOrientation = normalized.orientation;
            ledColor = normalized.ledColor;
            animationSpeed = normalized.animationSpeed;
            frames = normalized.frames;
            currentFrameIndex = 0;

            document.getElementById('grid-width-input').value = GRID_WIDTH;
            document.getElementById('grid-height-input').value = GRID_HEIGHT;
            const colorPicker = document.getElementById('color-picker');
            if (colorPicker) colorPicker.value = ledColor;
            const speedInput = document.getElementById('speed-input');
            if (speedInput) speedInput.value = animationSpeed;

            updateOrientationButtons();
            updateCellColor(ledColor);
            createGrid();
            renderFrameThumbnails();

            showToast(`Imported ${frames.length} frames`, 'success');
        } catch (err) {
            console.error('Import error:', err);
            showToast('Invalid JSON file', 'error');
        }
    };
```

- [ ] **Step 6: Manual verification**

Open `index.html`. (a) Import a JSON file whose content is `{"frames":[]}` → expect the "Invalid JSON file" toast and the app stays usable (no crash). (b) Import `{"frames":[{"coords":[]}],"gridWidth":5000,"gridHeight":5000}` → expect grid clamps to 64×64, no freeze. (c) Import a normal export from the app → loads correctly with colour, speed, and origin synced.

- [ ] **Step 7: Commit**

```bash
git add lib.js script.js tests/validation.test.js
git commit -m "fix: validate and clamp imported JSON to prevent crash and browser freeze"
```

---

## Task 4 (Bucket C): Colour Input Validation 🟢

`updateCellColor()` slices fixed string indices and assumes `#rrggbb`, producing `rgba(NaN,NaN,NaN,0.4)` for any 3-digit/named colour loaded from storage or import. Add a validated `parseHexColor()` to `lib.js` and route `updateCellColor` and `loadFromStorage` through the colour helpers (which already exist from Task 3).

**Files:**
- Create (in `lib.js`): `parseHexColor`
- Test: `tests/color.test.js`
- Modify: `script.js:272-281` (`updateCellColor`), `script.js:1080-1087` (replace `hexToRgb`), `script.js:1150` (caller), `script.js:106` (`loadFromStorage` colour)

- [ ] **Step 1: Write the failing colour tests**

Create `tests/color.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { isValidHexColor, normalizeColor, parseHexColor } = require('../lib.js');

test('isValidHexColor accepts 6-digit hex with or without hash', () => {
    assert.ok(isValidHexColor('#00f0ff'));
    assert.ok(isValidHexColor('00F0FF'));
});

test('isValidHexColor rejects short, named, or null colours', () => {
    assert.ok(!isValidHexColor('#fff'));
    assert.ok(!isValidHexColor('red'));
    assert.ok(!isValidHexColor(null));
});

test('normalizeColor adds a missing hash and falls back on garbage', () => {
    assert.strictEqual(normalizeColor('00f0ff', '#000000'), '#00f0ff');
    assert.strictEqual(normalizeColor('red', '#000000'), '#000000');
});

test('parseHexColor never returns NaN components', () => {
    const c = parseHexColor('not-a-color');
    assert.ok(Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b));
});

test('parseHexColor parses RGB components correctly', () => {
    assert.deepStrictEqual(parseHexColor('#ff8000'), { r: 255, g: 128, b: 0 });
    assert.deepStrictEqual(parseHexColor('00f0ff'), { r: 0, g: 240, b: 255 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/color.test.js`
Expected: FAIL — `parseHexColor is not a function`.

- [ ] **Step 3: Implement `parseHexColor` in `lib.js`**

Inside the factory, directly under `normalizeColor`, add:

```javascript
    function parseHexColor(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
            : { r: 0, g: 240, b: 255 };
    }
```

Add `parseHexColor` to the return object:

```javascript
    return {
        VERSION, indexToRowCol, rowColToIndex,
        isValidHexColor, normalizeColor, parseHexColor, clampDimension, validateImportedData
    };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/color.test.js`
Expected: PASS — 5 tests, 0 fail.

- [ ] **Step 5: Harden `updateCellColor()` in `script.js`**

Replace `script.js:272-281` with:

```javascript
function updateCellColor(color) {
    const root = document.documentElement;
    const safe = normalizeColor(color, '#00f0ff');
    root.style.setProperty('--cell-on', safe);

    const { r, g, b } = parseHexColor(safe);
    root.style.setProperty('--cell-on-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
}
```

- [ ] **Step 6: Replace the duplicate `hexToRgb` with `parseHexColor`**

Delete the `hexToRgb` definition at `script.js:1080-1087`. Update its only caller in `generateRustCode` (`script.js:1150`):

```javascript
                const rgb = parseHexColor(color || ledColor);
```

- [ ] **Step 7: Normalise the colour loaded from storage**

In `loadFromStorage`, replace `script.js:106` (`ledColor = data.ledColor || "#00f0ff";`) with:

```javascript
                ledColor = normalizeColor(data.ledColor, "#00f0ff");
```

- [ ] **Step 8: Manual verification**

In DevTools console, set a bad stored colour and reload:
`localStorage.setItem('neomatrix-autosave', JSON.stringify({frames:[{coords:[]}],ledColor:'red'}))` then refresh. Expected: cells render with the `#00f0ff` fallback and `getComputedStyle(document.documentElement).getPropertyValue('--cell-on-glow')` contains no `NaN`.

- [ ] **Step 9: Commit**

```bash
git add lib.js script.js tests/color.test.js
git commit -m "fix: validate hex colours to avoid NaN glow values from storage/import"
```

---

## Task 5 (Bucket D): GIF LZW Code-Size Fix 🟡

The LZW encoder bumps the code width at `nextCode > (1 << codeSize)` — one entry too late. The GIF/compress standard increments when the next table index reaches `2^codeSize`. As written, a code equal to `2^codeSize` can be emitted with too few bits, desyncing real decoders and corrupting any non-trivial GIF. We extract the encoder to `lib.js` as `gifLzwEncode`, fix the boundary, and prove correctness with an in-test decoder round-trip that crosses code-size boundaries.

**Files:**
- Create (in `lib.js`): `gifLzwEncode`
- Test: `tests/gif-lzw.test.js`
- Modify: `script.js:1258-1317` (delete `lzwEncode` method), `script.js:1377` (call site)

- [ ] **Step 1: Write the failing LZW round-trip tests (with a reference decoder)**

Create `tests/gif-lzw.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { gifLzwEncode } = require('../lib.js');

// Reference GIF LZW decoder: variable-width, LSB-first codes.
// Bumps code size when the table fills to 2^codeSize (must mirror a correct encoder).
function gifLzwDecode(bytes, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let dict;
    const initDict = () => {
        dict = [];
        for (let i = 0; i < clearCode; i++) dict.push([i]);
        dict.push(null); // clear
        dict.push(null); // eoi
    };
    initDict();

    let bitBuffer = 0, bitCount = 0, pos = 0;
    const readCode = () => {
        while (bitCount < codeSize) {
            bitBuffer |= (bytes[pos++] | 0) << bitCount;
            bitCount += 8;
        }
        const code = bitBuffer & ((1 << codeSize) - 1);
        bitBuffer >>= codeSize;
        bitCount -= codeSize;
        return code;
    };

    const out = [];
    let prev = null;
    for (;;) {
        const code = readCode();
        if (code === clearCode) { initDict(); codeSize = minCodeSize + 1; prev = null; continue; }
        if (code === eoiCode) break;

        let entry;
        if (code < dict.length && dict[code]) entry = dict[code].slice();
        else if (prev) entry = prev.concat(prev[0]);
        else throw new Error('invalid first code: ' + code);

        out.push(...entry);
        if (prev) {
            dict.push(prev.concat(entry[0]));
            if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
        }
        prev = entry;
    }
    return out;
}

test('LZW round-trips a short sequence', () => {
    const pixels = [0, 1, 1, 2, 3, 3, 3, 1, 0, 0, 2, 1];
    const { data, minCodeSize } = gifLzwEncode(pixels, 2);
    assert.deepStrictEqual(gifLzwDecode(data, minCodeSize), pixels);
});

test('LZW round-trips input that crosses code-size boundaries', () => {
    const pixels = [];
    for (let i = 0; i < 5000; i++) pixels.push(i % 16);
    const { data, minCodeSize } = gifLzwEncode(pixels, 4);
    assert.deepStrictEqual(gifLzwDecode(data, minCodeSize), pixels);
});

test('LZW handles a single-pixel image', () => {
    const { data, minCodeSize } = gifLzwEncode([0], 2);
    assert.deepStrictEqual(gifLzwDecode(data, minCodeSize), [0]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/gif-lzw.test.js`
Expected: FAIL — `gifLzwEncode is not a function`.

- [ ] **Step 3: Implement the fixed `gifLzwEncode` in `lib.js`**

Inside the factory, add (above `const VERSION`):

```javascript
    // --- GIF LZW compression (variable-width, LSB-first) ---

    function gifLzwEncode(pixels, colorBits) {
        const minCodeSize = Math.max(2, colorBits);
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;

        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;
        const maxCode = 4095;

        const dictionary = new Map();
        for (let i = 0; i < clearCode; i++) {
            dictionary.set(String(i), i);
        }

        const output = [];
        let buffer = 0;
        let bufferSize = 0;

        const writeCode = (code) => {
            buffer |= code << bufferSize;
            bufferSize += codeSize;
            while (bufferSize >= 8) {
                output.push(buffer & 0xff);
                buffer >>= 8;
                bufferSize -= 8;
            }
        };

        writeCode(clearCode);

        let current = String(pixels[0]);
        for (let i = 1; i < pixels.length; i++) {
            const next = String(pixels[i]);
            const combined = current + ',' + next;

            if (dictionary.has(combined)) {
                current = combined;
            } else {
                writeCode(dictionary.get(current));

                if (nextCode <= maxCode) {
                    dictionary.set(combined, nextCode++);
                    // FIX: bump when the table fills to 2^codeSize (was `> (1 << codeSize)`).
                    if (nextCode >= (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                }

                current = next;
            }
        }

        writeCode(dictionary.get(current));
        writeCode(eoiCode);

        if (bufferSize > 0) {
            output.push(buffer & 0xff);
        }

        return { data: new Uint8Array(output), minCodeSize };
    }
```

Add `gifLzwEncode` to the return object:

```javascript
    return {
        VERSION, indexToRowCol, rowColToIndex,
        isValidHexColor, normalizeColor, parseHexColor, clampDimension, validateImportedData,
        gifLzwEncode
    };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/gif-lzw.test.js`
Expected: PASS — 3 tests, 0 fail. (Re-run after temporarily reverting the fix to `> (1 << codeSize)`: the boundary-crossing test must FAIL, confirming the test has teeth. Restore the fix afterward.)

- [ ] **Step 5: Delete the in-class `lzwEncode` method from `script.js`**

Delete the entire `lzwEncode(pixels, colorBits) { ... }` method on `GifEncoder` (`script.js:1258-1317`).

- [ ] **Step 6: Update the call site in `GifEncoder.encode()`**

At `script.js:1377`, replace `this.lzwEncode(pixels, colorBits)` with the library function:

```javascript
            const { data: lzwData, minCodeSize } = gifLzwEncode(pixels, colorBits);
```

- [ ] **Step 7: Manual verification**

Open `index.html`, create a multi-frame animation using several colours, click **GIF**, and open the downloaded `animation.gif` in a browser/Preview/image viewer. Expected: the GIF plays correctly with no corrupted/garbled frames.

- [ ] **Step 8: Commit**

```bash
git add lib.js script.js tests/gif-lzw.test.js
git commit -m "fix: correct GIF LZW code-size boundary to prevent corrupted exports"
```

---

## Task 6 (Bucket D): Rust Frame-Name Sanitisation 🟢

`generateRustCode()` interpolates `frame.name` straight into a single-line `// ${frame.name}` comment. An imported frame name containing a newline breaks out of the comment into code, producing invalid `.rs` output. Add a pure `sanitizeFrameName()` and apply it at the interpolation site.

**Files:**
- Create (in `lib.js`): `sanitizeFrameName`
- Test: `tests/rust.test.js`
- Modify: `script.js:1155` (comment interpolation)

- [ ] **Step 1: Write the failing sanitisation tests**

Create `tests/rust.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { sanitizeFrameName } = require('../lib.js');

test('strips newlines that would break a // comment', () => {
    const out = sanitizeFrameName('evil\n} fn hack() {');
    assert.ok(!out.includes('\n'));
    assert.ok(!out.includes('\r'));
});

test('collapses control characters to spaces and trims', () => {
    assert.strictEqual(sanitizeFrameName('Frame\r\n1\t'), 'Frame 1');
});

test('handles non-string input', () => {
    assert.strictEqual(sanitizeFrameName(null), '');
    assert.strictEqual(sanitizeFrameName(undefined), '');
    assert.strictEqual(sanitizeFrameName(42), '42');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rust.test.js`
Expected: FAIL — `sanitizeFrameName is not a function`.

- [ ] **Step 3: Implement `sanitizeFrameName` in `lib.js`**

Inside the factory, add (above `const VERSION`):

```javascript
    // --- Rust code generation helpers ---

    function sanitizeFrameName(name) {
        const str = (name === null || name === undefined) ? '' : String(name);
        return str.replace(/[\r\n\x00-\x1F]+/g, ' ').trim();
    }
```

Add it to the return object:

```javascript
    return {
        VERSION, indexToRowCol, rowColToIndex,
        isValidHexColor, normalizeColor, parseHexColor, clampDimension, validateImportedData,
        gifLzwEncode, sanitizeFrameName
    };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/rust.test.js`
Expected: PASS — 3 tests, 0 fail.

- [ ] **Step 5: Apply sanitisation in `generateRustCode()`**

At `script.js:1155`, replace the comment line:

```javascript
        code += `
    // ${sanitizeFrameName(frame.name)}
    const FRAME_${i + 1}: &'static [Pixel] = &[${arrItems}];
`;
```

- [ ] **Step 6: Manual verification**

In DevTools console run `frames[0].name = "bad\n} fn x(){";` then click **Finished** (or **Rust**). Expected: every `//` comment in the generated code stays on one line; no stray `}`/`fn` leaks into code.

- [ ] **Step 7: Commit**

```bash
git add lib.js script.js tests/rust.test.js
git commit -m "fix: sanitize frame names in generated Rust comments"
```

---

## Task 7 (Bucket E): Rendering Performance — Cache Grid Buttons 🟡

`applyFrameToGrid()` and `renderMegaCoords()` call `document.querySelectorAll('#grid-container button')` on every invocation; during scrolling this fires as often as every 50 ms over up to 4096 cells. Cache the button list when the grid is built and reuse it. This is DOM-bound, so verification is manual (no unit test).

**Files:**
- Modify: `script.js:8-29` (cache var), `script.js:354-372` (`createGrid` populate cache), `script.js:587` & `:897` (use cache)

- [ ] **Step 1: Add a module-level button cache**

After the `appInitialized` flag added in Task 2 (near `script.js:29`), add:

```javascript
// Cached grid button elements; rebuilt by createGrid()
let gridButtons = [];
```

- [ ] **Step 2: Populate the cache in `createGrid()`**

In `createGrid`, reset the cache before the build loop and push each button as it is created. Replace the loop region (`script.js:354-372`) so it reads:

```javascript
    // Create buttons
    gridButtons = [];
    const totalCells = GRID_WIDTH * GRID_HEIGHT;
    for (let i = 0; i < totalCells; i++) {
        const btn = document.createElement("button");
        const { row, col } = indexToRowCol(i, GRID_WIDTH, GRID_HEIGHT, gridOrientation);

        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', `Cell row ${row}, column ${col}`);
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('data-index', i);

        btn.addEventListener("click", () => handleCellClick(btn, i));

        // Touch feedback
        btn.addEventListener('touchstart', () => btn.classList.add('touching'), { passive: true });
        btn.addEventListener('touchend', () => btn.classList.remove('touching'), { passive: true });

        container.appendChild(btn);
        gridButtons.push(btn);
    }
```

- [ ] **Step 3: Use the cache in `applyFrameToGrid()`**

Replace `script.js:587` (`const buttons = document.querySelectorAll("#grid-container button");`) with:

```javascript
    const buttons = gridButtons;
```

- [ ] **Step 4: Use the cache in `renderMegaCoords()`**

Replace `script.js:897` (`const buttons = document.querySelectorAll("#grid-container button");`) with:

```javascript
    const buttons = gridButtons;
```

- [ ] **Step 5: Manual verification — correctness**

Open `index.html`. Draw a shape, switch frames, undo/redo, change grid size, and play the animation. Expected: rendering is identical to before (the cache is rebuilt whenever `createGrid()` runs, so size changes stay correct).

- [ ] **Step 6: Manual verification — performance**

Set the grid to 64×64, fill several frames, set speed to 50 ms, and Play. In DevTools → Performance, record ~3 s. Expected: no `querySelectorAll` calls in the scroll interval's stack; reduced scripting time per frame versus the pre-change baseline.

- [ ] **Step 7: Commit**

```bash
git add script.js
git commit -m "perf: cache grid buttons instead of querySelectorAll on every animation tick"
```

---

## Final Verification

- [ ] **Run the full suite**

Run: `npm test`
Expected: all suites pass — geometry (3), validation (9), color (5), gif-lzw (3), rust (3) = 23 tests, 0 fail.

- [ ] **Full manual smoke test**

Open `index.html`: draw across all four origins, multi-frame animation, undo/redo, import a normal export, export JSON/CSV/GIF/Rust, and confirm autosave persists across a refresh.

---

## Self-Review Notes

- **Spec coverage:** Task 1→finding #2, Task 2→#1, Task 3→#3, Task 4→#7, Task 5→#4, Task 6→#6, Task 7→#5. All 7 findings covered.
- **Type consistency:** `lib.js` export names (`indexToRowCol`, `rowColToIndex`, `isValidHexColor`, `normalizeColor`, `parseHexColor`, `clampDimension`, `validateImportedData`, `gifLzwEncode`, `sanitizeFrameName`) are referenced identically in `script.js` call sites and test `require` destructures. `validateImportedData` returns `{ gridWidth, gridHeight, orientation, ledColor, animationSpeed, frames }`, matching the global assignments in the rewritten `handleImport`. `gifLzwEncode` returns `{ data, minCodeSize }`, matching the `encode()` call site.
- **Design decision flagged:** Bucket A redefines non-`top-left` origins as corner reflections (was buggy rotation) — documented inline; confirm this matches intended physical-wiring semantics before merge.
