# Bucket 2 — Frame Layout & Rust Export Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the generated Rust from emitting empty frames (which makes the scroll loop compute `width_of_frame = isize::MIN - isize::MAX + 1` and overflow), and make the scrolling preview and the Rust output agree on which frames participate.

**Architecture:** The preview (`buildMegaFrame`) already skips empty frames via an inline early-return, but `generateRustCode` emits a `FRAME_n` const + `frames_data` entry for *every* frame. We extract a single pure helper `nonEmptyFrames(frames)` into `lib.js`, unit-test it, then route both call sites through it so they can never diverge again. The Rust fix is verified end-to-end through the existing jsdom harness (which can call `generateRustCode` because top-level `let frames` lives in the shared global lexical environment that `applyFrameToGrid` tests already rely on).

**Tech Stack:** Vanilla JS (`lib.js` pure logic, `script.js` consumers), `node --test`, jsdom integration tests.

**Conventions:**
- Run one file with `node --test tests/<file>.js`; full suite with `node --test`.
- Confirm `git config user.email` is allowed before committing; never `--no-verify`.

---

## File Structure

- `lib.js` — add `nonEmptyFrames(frames)` and export it.
- `script.js` — `buildMegaFrame()` (~836-859) and `generateRustCode()` (~1096-1121) consume the helper.
- `tests/rust.test.js` — unit-test `nonEmptyFrames`.
- `tests/dom.test.js` — integration test asserting the Rust output excludes empty frames.

---

### Task 1: Add the `nonEmptyFrames` helper to lib.js

**Files:**
- Modify: `lib.js` (add function + add to the returned export object on line ~187)
- Test: `tests/rust.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/rust.test.js`. First update the require at the top of the file:

```javascript
const { sanitizeFrameName, nonEmptyFrames } = require('../lib.js');
```

Then append:

```javascript
test('nonEmptyFrames keeps only frames that have coords, preserving order', () => {
    const a = { name: 'A', coords: [{ row: 0, col: 0, color: '#fff' }] };
    const empty = { name: 'B', coords: [] };
    const c = { name: 'C', coords: [{ row: 1, col: 1, color: '#000' }] };
    assert.deepStrictEqual(nonEmptyFrames([a, empty, c]), [a, c]);
});

test('nonEmptyFrames tolerates missing/garbage coords', () => {
    assert.deepStrictEqual(nonEmptyFrames([{ name: 'x' }, null, { coords: 'nope' }]), []);
});

test('nonEmptyFrames returns an empty array when every frame is empty', () => {
    assert.deepStrictEqual(nonEmptyFrames([{ coords: [] }, { coords: [] }]), []);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/rust.test.js`
Expected: FAIL — `nonEmptyFrames is not a function`.

- [ ] **Step 3: Implement the helper**

In `lib.js`, add this function in the "Rust code generation helpers" section (just below `sanitizeFrameName`):

```javascript
    // Frames that actually contribute pixels to the layout. Used by BOTH the
    // scrolling preview (buildMegaFrame) and the Rust generator so they agree on
    // which frames exist — an empty frame in the Rust output makes the scroll
    // loop compute width_of_frame from isize::MAX/MIN and overflow.
    function nonEmptyFrames(frames) {
        return (Array.isArray(frames) ? frames : [])
            .filter(f => f && Array.isArray(f.coords) && f.coords.length > 0);
    }
```

Then add it to the export object on the last `return { ... }` line:

```javascript
    return { VERSION, sanitizeFrameName, nonEmptyFrames, indexToRowCol, rowColToIndex, isValidHexColor, normalizeColor, parseHexColor, clampDimension, validateImportedData, gifLzwEncode };
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/rust.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git config user.email   # confirm allowed address
git add lib.js tests/rust.test.js
git commit -m "feat: add nonEmptyFrames layout helper to lib

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 2: Route `buildMegaFrame` through the helper

**Files:**
- Modify: `script.js:836-859` (`buildMegaFrame`)

(No new test — this is a behaviour-preserving refactor; the inline `if (!frame.coords.length) return;` already does exactly what `nonEmptyFrames` does. The integration coverage comes from Task 3, and the existing scroll path is unchanged.)

- [ ] **Step 1: Replace the inline skip with the shared helper**

Current:

```javascript
function buildMegaFrame() {
    const result = [];
    let currentX = 0;

    frames.forEach((frame) => {
        if (!frame.coords.length) return;

        let minC = Infinity, maxC = -Infinity;
```

Change the iteration to use the helper and remove the now-redundant early return:

```javascript
function buildMegaFrame() {
    const result = [];
    let currentX = 0;

    nonEmptyFrames(frames).forEach((frame) => {
        let minC = Infinity, maxC = -Infinity;
```

Leave the rest of the function body unchanged.

- [ ] **Step 2: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS — the existing jsdom tests still pass (grid/orientation/undo unaffected).

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "refactor: buildMegaFrame uses shared nonEmptyFrames helper

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 3: Exclude empty frames from the generated Rust

**Files:**
- Modify: `script.js:1096-1121` (the two `frames.forEach` loops + the `frames_data` array size in `generateRustCode`)
- Test: `tests/dom.test.js`

- [ ] **Step 1: Write the failing integration test**

Append to `tests/dom.test.js` (it already imports `JSDOM`, `html`, `libSrc`, `appSrc`, and defines `makeApp`/`buttons`):

```javascript
test('generated Rust excludes empty frames so the scroll math never overflows', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        // Frame 1: one pixel
        buttons(w)[0].click();
        // Frame 2: empty
        w.eval('newFrame()');
        // Frame 3: one pixel (newFrame moved currentFrameIndex to the new frame)
        w.eval('newFrame()');
        buttons(w)[3].click();

        // frames = [non-empty, EMPTY, non-empty]
        const code = w.eval('generateRustCode(200, GRID_WIDTH, GRID_HEIGHT)');

        const frameConsts = (code.match(/const FRAME_\d+/g) || []).length;
        assert.strictEqual(frameConsts, 2,
            'only the two non-empty frames should be emitted as FRAME_ consts');
        assert.ok(/\[&\[Pixel\]; 2\]/.test(code),
            'frames_data should be sized for 2 frames, not 3');
        // The middle empty frame must not leave a zero-length const behind.
        assert.ok(!/= &\[\];/.test(code),
            'no empty FRAME_ const should be generated');
    } finally {
        dom.window.close();
    }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/dom.test.js`
Expected: FAIL — currently 3 `FRAME_` consts are emitted and `frames_data: [&[Pixel]; 3]`, and the empty frame produces `= &[];`.

- [ ] **Step 3: Generate Rust from the non-empty frames only**

In `script.js`, `generateRustCode` currently has (after the big template string assigned to `code`):

```javascript
    frames.forEach((frame, i) => {
        const arrItems = frame.coords
            .map(({ row, col, color }) => {
                const rgb = parseHexColor(color || ledColor);
                return `(${col}, ${row}, ${rgb.r}, ${rgb.g}, ${rgb.b})`;
            })
            .join(", ");
        code += `
    // ${sanitizeFrameName(frame.name)}
    const FRAME_${i + 1}: &'static [Pixel] = &[${arrItems}];
`;
    });
```

…and later:

```javascript
        const frames_data: [&[Pixel]; ${frames.length}] = [
`;
    frames.forEach((_, i) => {
        code += `            Self::FRAME_${i + 1},\n`;
    });
```

Introduce a single local list and use it in all three places. Replace the first loop block with:

```javascript
    const renderFrames = nonEmptyFrames(frames);

    renderFrames.forEach((frame, i) => {
        const arrItems = frame.coords
            .map(({ row, col, color }) => {
                const rgb = parseHexColor(color || ledColor);
                return `(${col}, ${row}, ${rgb.r}, ${rgb.g}, ${rgb.b})`;
            })
            .join(", ");
        code += `
    // ${sanitizeFrameName(frame.name)}
    const FRAME_${i + 1}: &'static [Pixel] = &[${arrItems}];
`;
    });
```

Replace the `frames_data` array size line:

```javascript
        const frames_data: [&[Pixel]; ${renderFrames.length}] = [
`;
    renderFrames.forEach((_, i) => {
        code += `            Self::FRAME_${i + 1},\n`;
    });
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/dom.test.js`
Expected: PASS.

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add script.js tests/dom.test.js
git commit -m "fix: exclude empty frames from generated Rust to prevent isize overflow

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

## Self-Review

- **Spec coverage:** Tasks 1-3 cover Project Hub task #2 (empty-frame Rust overflow) and the preview/export divergence noted in the bucket plan. ✅
- **Placeholder scan:** All code shown in full; no "similar to" references. ✅
- **Type consistency:** `nonEmptyFrames` defined in Task 1, exported, then used identically in `buildMegaFrame` (Task 2) and `generateRustCode` (Task 3). `renderFrames` is the single local name used for all three Rust sites. ✅
- **Edge case:** If every frame is empty, `renderFrames.length === 0`, producing `[&[Pixel]; 0] = [];` and an empty loop body — valid Rust, no overflow. ✅
