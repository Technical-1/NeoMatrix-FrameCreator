# Bucket 3 — GIF Color Quantization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Guarantee the GIF encoder never emits a palette larger than 256 colors (so `colorBits` never exceeds 8), eliminating the corrupt Logical Screen Descriptor / oversized LZW codes that occur when the anti-aliased, alpha-blended canvas render produces hundreds of unique RGB values.

**Architecture:** The current `GifEncoder.buildColorTable()` collects *every* unique RGB with no cap and `encode()` looks colors up by exact string key (`colors.get(key) || 0`), so any color not in the table silently becomes black. We extract a pure, testable `buildGifPalette(rgbTriples, maxColors)` into `lib.js` that (a) keeps the most-frequent ≤256 colors with black forced at index 0, and (b) returns an `indexOf(r,g,b)` that maps unlisted colors to the *nearest* palette entry instead of black. `GifEncoder` delegates to it. A separate, optional task reduces palette churn at the source by rendering flatter cells.

**Tech Stack:** Vanilla JS (`lib.js` pure logic, `GifEncoder` in `script.js`), `node --test`.

**Conventions:**
- Run one file with `node --test tests/<file>.js`; full suite with `node --test`.
- Confirm `git config user.email` is allowed before committing; never `--no-verify`.

---

## File Structure

- `lib.js` — add `buildGifPalette(rgbTriples, maxColors)` and export it.
- `script.js` — `GifEncoder.buildColorTable()` and `GifEncoder.encode()` delegate to it; optional flat-render tweak in `downloadGIF()`.
- `tests/gif-color.test.js` — NEW: palette cap, black-at-0, exact + nearest mapping. (`tests/gif-lzw.test.js` is untouched.)

---

### Task 1: Add `buildGifPalette` to lib.js

**Files:**
- Modify: `lib.js` (add function in the GIF section + export it)
- Test: `tests/gif-color.test.js` (new)

- [ ] **Step 1: Write the failing tests**

Create `tests/gif-color.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const { buildGifPalette } = require('../lib.js');

test('palette never exceeds 256 colours or 8 bits', () => {
    const triples = [];
    for (let i = 0; i < 1000; i++) {
        triples.push([i % 256, (i * 7) % 256, (i * 13) % 256]);
    }
    const { table, colorBits } = buildGifPalette(triples, 256);
    assert.ok(colorBits <= 8, `colorBits ${colorBits} must be <= 8`);
    assert.ok(table.length <= 256 * 3, `table ${table.length} bytes must be <= 768`);
});

test('black is always palette index 0', () => {
    const { indexOf, table } = buildGifPalette([[255, 0, 0], [0, 255, 0]], 256);
    assert.strictEqual(indexOf(0, 0, 0), 0);
    assert.strictEqual(table[0], 0);
    assert.strictEqual(table[1], 0);
    assert.strictEqual(table[2], 0);
});

test('exact colours map back to their own entry', () => {
    const { indexOf, table } = buildGifPalette([[255, 0, 0]], 256);
    const ri = indexOf(255, 0, 0);
    assert.strictEqual(table[ri * 3], 255);
    assert.strictEqual(table[ri * 3 + 1], 0);
    assert.strictEqual(table[ri * 3 + 2], 0);
});

test('an unlisted colour maps to the nearest entry, not black', () => {
    const { indexOf } = buildGifPalette([[0, 0, 0], [255, 255, 255]], 256);
    const nearWhite = indexOf(250, 250, 250);
    const nearBlack = indexOf(5, 5, 5);
    assert.notStrictEqual(nearWhite, nearBlack);
    assert.strictEqual(nearBlack, 0); // closer to black
});

test('colorBits is a valid GIF GCT size (>= 1)', () => {
    const { colorBits } = buildGifPalette([[10, 20, 30]], 256);
    assert.ok(colorBits >= 1 && colorBits <= 8);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/gif-color.test.js`
Expected: FAIL — `buildGifPalette is not a function`.

- [ ] **Step 3: Implement `buildGifPalette`**

In `lib.js`, add this in the "GIF LZW compression" section (just above or below `gifLzwEncode`):

```javascript
    // Build a GIF Global Color Table from RGB triples, capped at maxColors (<=256).
    // Black (0,0,0) is forced to index 0 (the renderer's background). When more
    // than maxColors distinct colours appear, the most frequent are kept and any
    // other colour resolves to its nearest palette entry by squared RGB distance —
    // so the header stays valid and overflow colours degrade gracefully instead of
    // turning black or corrupting colorBits.
    function buildGifPalette(rgbTriples, maxColors = 256) {
        const cap = Math.max(2, Math.min(256, maxColors));
        const freq = new Map();
        freq.set('0,0,0', Infinity); // pin black to the front
        for (const [r, g, b] of rgbTriples) {
            const k = r + ',' + g + ',' + b;
            freq.set(k, (freq.get(k) || 0) + 1);
        }

        const chosen = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, cap)
            .map(([k]) => k.split(',').map(Number));

        const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(chosen.length))));
        const colorBits = Math.ceil(Math.log2(size));
        const table = new Uint8Array(size * 3);
        const exact = new Map();
        chosen.forEach(([r, g, b], i) => {
            table[i * 3] = r;
            table[i * 3 + 1] = g;
            table[i * 3 + 2] = b;
            exact.set(r + ',' + g + ',' + b, i);
        });

        function indexOf(r, g, b) {
            const hit = exact.get(r + ',' + g + ',' + b);
            if (hit !== undefined) return hit;
            let best = 0, bestD = Infinity;
            for (let i = 0; i < chosen.length; i++) {
                const [cr, cg, cb] = chosen[i];
                const d = (cr - r) * (cr - r) + (cg - g) * (cg - g) + (cb - b) * (cb - b);
                if (d < bestD) { bestD = d; best = i; }
            }
            return best;
        }

        return { table, colorBits, indexOf };
    }
```

Add it to the export object on the final `return { ... }` line:

```javascript
    return { VERSION, sanitizeFrameName, nonEmptyFrames, indexToRowCol, rowColToIndex, isValidHexColor, normalizeColor, parseHexColor, clampDimension, validateImportedData, gifLzwEncode, buildGifPalette };
```

> Note: if Bucket 2 has not been merged, omit `nonEmptyFrames` from the export line and keep the rest.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/gif-color.test.js`
Expected: PASS (all 5).

- [ ] **Step 5: Commit**

```bash
git config user.email   # confirm allowed address
git add lib.js tests/gif-color.test.js
git commit -m "feat: add capped GIF palette builder with nearest-colour mapping

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 2: Make `GifEncoder` use the capped palette

**Files:**
- Modify: `script.js:1178-1204` (`buildColorTable`) and `script.js:1206-1264` (`encode`, the palette destructure + the indexed-pixel loop)

(No new unit test: `GifEncoder` depends on canvas `ImageData` and isn't loadable under `node --test`. The palette invariant is proven by Task 1; this task is a delegation refactor verified by the full suite + a manual GIF export in Step 4.)

- [ ] **Step 1: Replace `buildColorTable` to delegate to the helper**

Current:

```javascript
    // Build color table from all frames
    buildColorTable() {
        const colors = new Map();
        colors.set('0,0,0', 0); // Black always first (background)

        this.frames.forEach(frame => {
            const data = frame.imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const key = `${data[i]},${data[i+1]},${data[i+2]}`;
                if (!colors.has(key)) {
                    colors.set(key, colors.size);
                }
            }
        });

        // Pad to power of 2
        const colorCount = Math.max(4, Math.pow(2, Math.ceil(Math.log2(colors.size))));
        const table = new Uint8Array(colorCount * 3);

        colors.forEach((index, key) => {
            const [r, g, b] = key.split(',').map(Number);
            table[index * 3] = r;
            table[index * 3 + 1] = g;
            table[index * 3 + 2] = b;
        });

        return { table, colors, colorBits: Math.ceil(Math.log2(colorCount)) };
    }
```

Replace the whole method with:

```javascript
    // Build a capped (<=256 colour) GIF color table from all frames.
    buildColorTable() {
        const triples = [];
        this.frames.forEach(frame => {
            const data = frame.imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                triples.push([data[i], data[i + 1], data[i + 2]]);
            }
        });
        return buildGifPalette(triples, 256); // { table, colorBits, indexOf }
    }
```

- [ ] **Step 2: Update `encode` to use `indexOf`**

In `encode()`, change the destructure at the top:

```javascript
    encode() {
        const { table, colorBits } = this.buildColorTable();
        const indexOf = this.buildColorTable().indexOf;
```

Replace those two lines with a single call (avoid building the table twice):

```javascript
    encode() {
        const { table, colorBits, indexOf } = this.buildColorTable();
```

Then, in the per-frame "Convert image data to indexed pixels" loop, change the lookup. Current:

```javascript
            // Convert image data to indexed pixels
            const pixels = [];
            const data = frame.imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const key = `${data[i]},${data[i+1]},${data[i+2]}`;
                pixels.push(colors.get(key) || 0);
            }
```

Replace with:

```javascript
            // Convert image data to indexed pixels (nearest palette entry)
            const pixels = [];
            const data = frame.imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                pixels.push(indexOf(data[i], data[i + 1], data[i + 2]));
            }
```

- [ ] **Step 3: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS, 0 failures (the GIF LZW round-trip tests still pass).

- [ ] **Step 4: Manual verification (browser)**

1. Open `index.html` in a browser.
2. Draw a multi-color pattern across 2–3 frames using several distinct colors.
3. Click **GIF**. Confirm `animation.gif` downloads and opens correctly in an image viewer / browser (previously this produced a corrupt file once the palette passed 256 colors).

- [ ] **Step 5: Commit**

```bash
git add script.js
git commit -m "fix: cap GIF palette at 256 colours via shared buildGifPalette

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 3 (optional, quality): Reduce palette churn in the GIF renderer

The cap in Tasks 1–2 makes any export *valid*, but anti-aliased rounded rects + alpha glow/highlight still generate many near-duplicate colors that get nearest-mapped (slightly muddier output, larger file). This task trims the alpha layers so realistic designs stay well under 256 colors and look crisp.

**Files:**
- Modify: `script.js:1372-1396` (the lit-pixel render loop inside `downloadGIF`)

- [ ] **Step 1: Drop the translucent glow/highlight layers**

In the `megaCoords.forEach` render loop, remove the outer glow, inner glow, and white highlight `drawRoundedRect` calls, keeping only the solid main LED fill:

```javascript
                megaCoords.forEach(pt => {
                    const shiftedCol = pt.col + offset;
                    if (shiftedCol >= 0 && shiftedCol < GRID_WIDTH) {
                        const x = padding + shiftedCol * (cellSize + cellGap);
                        const y = padding + pt.row * (cellSize + cellGap);
                        const color = pt.color || ledColor;

                        // Solid LED fill — flat colours keep the GIF palette small and crisp.
                        ctx.fillStyle = color;
                        drawRoundedRect(x, y, cellSize, cellSize, cellRadius);
                    }
                });
```

- [ ] **Step 2: Manual verification (browser)**

Re-export the GIF from Step "Task 2 / Step 4". Confirm it still renders the animation, with flat LED cells and a noticeably smaller file.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "perf: flatten GIF cell rendering to keep palette small and output crisp

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

## Self-Review

- **Spec coverage:** Tasks 1-2 cover Project Hub task #1 (GIF >256-color corruption). Task 3 addresses the root-cause palette churn noted in the bucket plan. ✅
- **Placeholder scan:** Full code for the helper, the two `GifEncoder` methods, and the render loop. No "add appropriate handling". ✅
- **Type consistency:** `buildGifPalette` returns `{ table, colorBits, indexOf }` in Task 1; `buildColorTable` returns the same shape in Task 2; `encode` destructures `{ table, colorBits, indexOf }`. The old `colors` Map is fully removed from `encode`. ✅
- **Double-build guard:** Task 2 Step 2 explicitly collapses the two `buildColorTable()` calls into one destructure. ✅
