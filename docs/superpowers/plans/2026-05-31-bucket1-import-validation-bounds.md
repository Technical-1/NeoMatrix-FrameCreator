# Bucket 1 — Import Validation Bounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `validateImportedData()` drop pixel coordinates that fall outside the (already-clamped) grid, so imported/autosaved data can never light the wrong cell.

**Architecture:** `lib.js` already clamps grid *dimensions* to 1–64 but only filters coords for finite `row`/`col`. We extend the existing coord `.filter()` to also require `0 <= row < height` and `0 <= col < width`. The width/height are already computed earlier in the same function, so no signature change is needed. This is a pure-function change covered by Node's built-in test runner.

**Tech Stack:** Vanilla JS (CommonJS `lib.js`), `node --test`.

**Conventions:**
- Run the suite with `node --test` (or one file: `node --test tests/validation.test.js`).
- Before any commit, confirm `git config user.email` returns an allowed value (`51518860+Technical-1@users.noreply.github.com` or `jacobrk2001@gmail.com`). Never use `--no-verify`.

---

## File Structure

- `lib.js` — `validateImportedData()` (lines ~147-183). Only the coord `.filter()` predicate changes.
- `tests/validation.test.js` — add bounds cases alongside the existing `drops coords with non-finite row/col` test.

No new files. The fix is one predicate; the value is in locking it with tests.

---

### Task 1: Drop out-of-bounds coordinates on import

**Files:**
- Modify: `lib.js:175-180` (the `frames` mapping inside `validateImportedData`)
- Test: `tests/validation.test.js`

- [ ] **Step 1: Write the failing tests**

Append to `tests/validation.test.js`:

```javascript
test('drops coords whose col is beyond the grid width', () => {
    // gridWidth/Height default to 8 -> valid cols/rows are 0..7
    const r = validateImportedData(
        { frames: [{ coords: [{ row: 0, col: 0 }, { row: 0, col: 100 }] }] },
        DEFAULTS
    );
    assert.strictEqual(r.frames[0].coords.length, 1);
    assert.deepStrictEqual(r.frames[0].coords[0], { row: 0, col: 0, color: '#00f0ff' });
});

test('drops coords whose row is beyond the grid height', () => {
    const r = validateImportedData(
        { frames: [{ coords: [{ row: 50, col: 2 }] }] },
        DEFAULTS
    );
    assert.strictEqual(r.frames[0].coords.length, 0);
});

test('drops negative coords', () => {
    const r = validateImportedData(
        { frames: [{ coords: [{ row: -1, col: 0 }, { row: 0, col: -5 }] }] },
        DEFAULTS
    );
    assert.strictEqual(r.frames[0].coords.length, 0);
});

test('keeps coords on the bounding edge of the grid', () => {
    // 8x8 grid -> (7,7) is the last valid cell
    const r = validateImportedData(
        { frames: [{ coords: [{ row: 7, col: 7 }] }], gridWidth: 8, gridHeight: 8 },
        DEFAULTS
    );
    assert.strictEqual(r.frames[0].coords.length, 1);
});

test('validates coords against the clamped dimensions, not the raw ones', () => {
    // gridWidth 5000 clamps to 64; col 100 is still out of the clamped 64-wide grid
    const r = validateImportedData(
        { frames: [{ coords: [{ row: 0, col: 100 }, { row: 0, col: 63 }] }], gridWidth: 5000, gridHeight: 5000 },
        DEFAULTS
    );
    assert.strictEqual(r.gridWidth, 64);
    assert.strictEqual(r.frames[0].coords.length, 1);
    assert.strictEqual(r.frames[0].coords[0].col, 63);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/validation.test.js`
Expected: FAIL — the out-of-bounds coords are currently kept, so length assertions are wrong (e.g. `1 !== 2`).

- [ ] **Step 3: Tighten the coord filter**

In `lib.js`, the current `frames` mapping is:

```javascript
        const frames = data.frames.map((f, i) => ({
            name: typeof (f && f.name) === 'string' ? f.name : `Frame ${i + 1}`,
            coords: (Array.isArray(f && f.coords) ? f.coords : [])
                .filter(pt => pt && Number.isFinite(pt.row) && Number.isFinite(pt.col))
                .map(pt => ({ row: pt.row, col: pt.col, color: normalizeColor(pt.color, ledColor) }))
        }));
```

Replace the `.filter(...)` line so it also enforces the clamped bounds (`width`/`height` are already in scope above):

```javascript
        const frames = data.frames.map((f, i) => ({
            name: typeof (f && f.name) === 'string' ? f.name : `Frame ${i + 1}`,
            coords: (Array.isArray(f && f.coords) ? f.coords : [])
                .filter(pt => pt && Number.isFinite(pt.row) && Number.isFinite(pt.col)
                    && pt.row >= 0 && pt.row < height
                    && pt.col >= 0 && pt.col < width)
                .map(pt => ({ row: pt.row, col: pt.col, color: normalizeColor(pt.color, ledColor) }))
        }));
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/validation.test.js`
Expected: PASS (all new + existing validation tests).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS — total test count increased by 5, 0 failures.

- [ ] **Step 6: Commit**

```bash
git config user.email   # confirm it prints an allowed address first
git add lib.js tests/validation.test.js
git commit -m "fix: drop imported coords that fall outside the grid bounds

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

## Self-Review

- **Spec coverage:** Task 1 covers Project Hub task #3 (out-of-bounds coords alias to wrong cell). ✅
- **Placeholder scan:** No TBD/TODO/"handle edge cases" — the predicate and tests are concrete. ✅
- **Type consistency:** Uses the existing `width`/`height` locals and `normalizeColor`; no new symbols. ✅
