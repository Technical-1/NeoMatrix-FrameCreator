# Bucket 4 — Toolbar & Keyboard UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three small DOM-layer fixes: (1) `updateGridSize` clamps over-max dimensions and applies the resize in one click instead of bailing; (2) the keyboard handler stops dereferencing a possibly-null `document.activeElement`; (3) the drag handlers use an explicit `parseInt` radix for consistency.

**Architecture:** All changes live in `script.js` event/DOM code. The two behavioral fixes are covered by jsdom integration tests in `tests/dom.test.js`. The keyboard test captures jsdom's `jsdomError` channel (where uncaught listener exceptions surface) to prove the null-deref is gone. The radix change is a provably-equivalent cleanup committed alongside, with the full suite as its regression net.

**Tech Stack:** Vanilla JS (`script.js`), jsdom, `node --test`.

**Conventions:**
- Run one file with `node --test tests/dom.test.js`; full suite with `node --test`.
- Confirm `git config user.email` is allowed before committing; never `--no-verify`.

---

## File Structure

- `script.js` — `updateGridSize()` (~443-476), `setupKeyboardNavigation()` (~294-339), `handleDragStart`/`handleDrop` (~707-752).
- `tests/dom.test.js` — add a resize-clamp test, a keyboard-null-active-element test, and a small error-capturing harness.

---

### Task 1: Add an error-capturing jsdom harness to the test file

**Files:**
- Modify: `tests/dom.test.js` (top of file)

- [ ] **Step 1: Import `VirtualConsole` and add a harness helper**

At the top of `tests/dom.test.js`, the current require is:

```javascript
const { JSDOM } = require('jsdom');
```

Change it to also pull in `VirtualConsole`:

```javascript
const { JSDOM, VirtualConsole } = require('jsdom');
```

Then, directly below the existing `makeApp()` function, add:

```javascript
// Like makeApp(), but routes jsdom's uncaught listener errors into `errors`.
// jsdom reports exceptions thrown inside event listeners on the 'jsdomError'
// channel rather than rethrowing from dispatchEvent, so this is how we assert a
// handler did NOT throw.
function makeAppCapturingErrors() {
    const errors = [];
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => errors.push(e));
    const dom = new JSDOM(html, {
        runScripts: 'outside-only',
        url: 'http://localhost/',
        pretendToBeVisual: true,
        virtualConsole: vc
    });
    const w = dom.window;
    w.scrollTo = () => {};
    try { w.localStorage.clear(); } catch (e) { /* hermetic start */ }
    w.eval(libSrc);
    w.eval(appSrc);
    w.eval('initializeApp()');
    return { dom, w, errors };
}
```

- [ ] **Step 2: Sanity-run the existing suite (helper must not break parsing)**

Run: `node --test tests/dom.test.js`
Expected: PASS — existing 4 tests still pass; the new helper is unused so far.

- [ ] **Step 3: Commit**

```bash
git config user.email   # confirm allowed address
git add tests/dom.test.js
git commit -m "test: add jsdom error-capturing harness for DOM handler tests

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 2: `updateGridSize` clamps and applies in one action

**Files:**
- Modify: `script.js:443-476` (`updateGridSize`)
- Test: `tests/dom.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/dom.test.js`:

```javascript
test('updateGridSize clamps an over-max dimension and applies in one call', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        w.document.getElementById('grid-width-input').value = '100';
        w.document.getElementById('grid-height-input').value = '8';
        w.eval('updateGridSize()');

        assert.strictEqual([...w.document.querySelectorAll('#grid-container button')].length,
            64 * 8, 'grid should resize to 64x8 in a single call');
        assert.strictEqual(w.document.getElementById('grid-width-input').value, '64',
            'the width input should be clamped back to 64');
    } finally {
        dom.window.close();
    }
});

test('updateGridSize still rejects sub-1 dimensions without resizing', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        const before = [...w.document.querySelectorAll('#grid-container button')].length; // 64
        w.document.getElementById('grid-width-input').value = '0';
        w.document.getElementById('grid-height-input').value = '8';
        w.eval('updateGridSize()');

        assert.strictEqual([...w.document.querySelectorAll('#grid-container button')].length,
            before, 'a sub-1 dimension must not resize the grid');
        assert.strictEqual(w.document.getElementById('grid-width-input').value, '8',
            'inputs revert to the current size on a sub-1 entry');
    } finally {
        dom.window.close();
    }
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/dom.test.js`
Expected: FAIL on the first test — current code writes `64`/`8` into the inputs but `return`s without resizing, so the grid stays 8×8 (64 buttons, not 512).

- [ ] **Step 3: Rewrite `updateGridSize`**

Replace the whole function body. Current:

```javascript
function updateGridSize() {
    const widthInput = document.getElementById("grid-width-input");
    const heightInput = document.getElementById("grid-height-input");

    const newWidth = parseInt(widthInput.value, 10);
    const newHeight = parseInt(heightInput.value, 10);

    if (isNaN(newWidth) || newWidth < 1 || isNaN(newHeight) || newHeight < 1) {
        showToast("Size must be at least 1", 'error');
        widthInput.value = GRID_WIDTH;
        heightInput.value = GRID_HEIGHT;
        return;
    }

    if (newWidth > 64 || newHeight > 64) {
        showToast("Maximum size is 64", 'error');
        widthInput.value = Math.min(newWidth, 64);
        heightInput.value = Math.min(newHeight, 64);
        return;
    }

    if (newWidth === GRID_WIDTH && newHeight === GRID_HEIGHT) return;

    saveState();

    GRID_WIDTH = newWidth;
    GRID_HEIGHT = newHeight;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;
    createGrid();
    renderFrameThumbnails();

    showToast(`Grid: ${GRID_WIDTH}×${GRID_HEIGHT}`, 'success');
}
```

New:

```javascript
function updateGridSize() {
    const widthInput = document.getElementById("grid-width-input");
    const heightInput = document.getElementById("grid-height-input");

    const rawW = parseInt(widthInput.value, 10);
    const rawH = parseInt(heightInput.value, 10);

    if (isNaN(rawW) || isNaN(rawH) || rawW < 1 || rawH < 1) {
        showToast("Size must be at least 1", 'error');
        widthInput.value = GRID_WIDTH;
        heightInput.value = GRID_HEIGHT;
        return;
    }

    // clampDimension (from lib.js) clamps into [1, 64].
    const newWidth = clampDimension(rawW, GRID_WIDTH);
    const newHeight = clampDimension(rawH, GRID_HEIGHT);
    const wasClamped = newWidth !== rawW || newHeight !== rawH;

    // Reflect any clamping back into the inputs immediately.
    widthInput.value = newWidth;
    heightInput.value = newHeight;

    if (newWidth === GRID_WIDTH && newHeight === GRID_HEIGHT) {
        if (wasClamped) showToast("Maximum size is 64", 'error');
        return;
    }

    saveState();

    GRID_WIDTH = newWidth;
    GRID_HEIGHT = newHeight;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;
    createGrid();
    renderFrameThumbnails();

    showToast(
        wasClamped ? `Clamped to ${GRID_WIDTH}×${GRID_HEIGHT}` : `Grid: ${GRID_WIDTH}×${GRID_HEIGHT}`,
        wasClamped ? 'error' : 'success'
    );
}
```

> `clampDimension` is already exported by `lib.js` and exposed as a global (the same way `normalizeColor`, `parseHexColor`, etc. are used bare elsewhere in `script.js`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/dom.test.js`
Expected: PASS (both new tests + existing 4).

- [ ] **Step 5: Commit**

```bash
git add script.js tests/dom.test.js
git commit -m "fix: updateGridSize clamps over-max dimensions and applies in one click

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 3: Guard the keyboard handler against a null `activeElement`

**Files:**
- Modify: `script.js:297` (inside `setupKeyboardNavigation`)
- Test: `tests/dom.test.js`

- [ ] **Step 1: Write the failing test**

Append to `tests/dom.test.js`:

```javascript
test('keyboard handler does not error when document.activeElement is null', () => {
    const { dom, w, errors } = makeAppCapturingErrors();
    try {
        // Some browser states leave activeElement null; force that here.
        Object.defineProperty(w.document, 'activeElement', {
            configurable: true,
            get: () => null
        });

        w.document.dispatchEvent(new w.KeyboardEvent('keydown', {
            key: 'a', bubbles: true, cancelable: true
        }));

        assert.strictEqual(errors.length, 0,
            'a keypress with no active element must not raise an error');
    } finally {
        dom.window.close();
    }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/dom.test.js`
Expected: FAIL — `document.activeElement.tagName` throws `TypeError: Cannot read properties of null`, captured on the `jsdomError` channel, so `errors.length === 1`.

- [ ] **Step 3: Add optional chaining**

In `setupKeyboardNavigation`, the current guard is:

```javascript
        // Skip if in input field
        if (document.activeElement.tagName === 'INPUT') return;
```

Change it to:

```javascript
        // Skip if in input field
        if (document.activeElement?.tagName === 'INPUT') return;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tests/dom.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add script.js tests/dom.test.js
git commit -m "fix: guard keyboard handler against null activeElement

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 4: Add explicit radix to the drag handlers

**Files:**
- Modify: `script.js:708` (`handleDragStart`) and `script.js:731` (`handleDrop`)

(No dedicated test: `parseInt(decimalString)` and `parseInt(decimalString, 10)` are equivalent for `dataset.index` values, so a test would be tautological. The full suite is the regression net.)

- [ ] **Step 1: Add the radix in both handlers**

In `handleDragStart`:

```javascript
function handleDragStart(e) {
    draggedFrameIndex = parseInt(this.dataset.index, 10);
```

In `handleDrop`:

```javascript
    const targetIndex = parseInt(this.dataset.index, 10);
```

- [ ] **Step 2: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS, 0 failures.

- [ ] **Step 3: Commit**

```bash
git add script.js
git commit -m "style: pass explicit radix to parseInt in drag handlers

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

## Self-Review

- **Spec coverage:** Task 2 → Project Hub #5 (clamp-but-no-apply); Task 3 → #6 (activeElement null deref); Task 4 → #8 (parseInt radix). Task 1 is the harness enabling Task 3. ✅
- **Placeholder scan:** Full function bodies and exact line edits; no vague steps. ✅
- **Type consistency:** `makeAppCapturingErrors()` defined in Task 1 and used in Task 3. `clampDimension` is an existing lib export. The `wasClamped` local name is consistent within `updateGridSize`. ✅
- **Risk note:** The `jsdomError` channel is the documented place jsdom surfaces uncaught listener exceptions; if a future jsdom version rethrows instead, the test still fails-first (just via a thrown error rather than `errors.length`), which is acceptable. ✅
