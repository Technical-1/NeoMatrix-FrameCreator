# Bucket 5 — Metadata & Licensing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the project's license consistent and present (currently `script.js` says MIT, `package.json` + README say ISC, and the README links to a `LICENSE` file that doesn't exist), and stop the `lib.js` `VERSION` constant from drifting away from `package.json`.

**Architecture:** Standardize on **MIT** — it matches the explicit `@license MIT` already declared in `script.js`; the `ISC` in `package.json` is just the `npm init` default. We add a real `LICENSE` file, align `package.json` + README to MIT, sync `VERSION` to the package version, and add a tiny `meta.test.js` that fails if any of these drift again.

> **Decision point:** If Jacob prefers **ISC** instead, flip it: change `script.js:6` to ISC, keep `package.json` as-is, write an ISC `LICENSE`, and assert `pkg.license === 'ISC'` in Task 4. The structure of the plan is identical.

**Tech Stack:** `package.json`, `README.md`, `script.js` header, new `LICENSE`, `lib.js`, `node --test`.

**Conventions:**
- Run with `node --test` (or `node --test tests/meta.test.js`).
- Confirm `git config user.email` is allowed before committing; never `--no-verify`. Copyright holder for the LICENSE is **Jacob Kanfer**.

---

## File Structure

- `LICENSE` — NEW: standard MIT text, `Copyright (c) 2026 Jacob Kanfer`.
- `package.json` — `"license": "MIT"`, fill the empty `"author"`, bump nothing else.
- `README.md` — license badge `ISC` → `MIT`.
- `lib.js` — `VERSION` synced to `package.json` version.
- `tests/meta.test.js` — NEW: guards version sync + license consistency + LICENSE presence.

---

### Task 1: Add the LICENSE file

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Write the MIT license**

Create `LICENSE` with this exact content:

```text
MIT License

Copyright (c) 2026 Jacob Kanfer

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit**

```bash
git config user.email   # confirm allowed address
git add LICENSE
git commit -m "docs: add MIT LICENSE file

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 2: Align package.json to MIT and set the author

**Files:**
- Modify: `package.json:14-15`

- [ ] **Step 1: Set license and author**

Current:

```json
  "keywords": [],
  "author": "",
  "license": "ISC",
```

Change to:

```json
  "keywords": [],
  "author": "Jacob Kanfer",
  "license": "MIT",
```

- [ ] **Step 2: Verify the JSON still parses**

Run: `node -e "require('./package.json'); console.log('ok')"`
Expected: prints `ok`.

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: declare MIT license and set author in package.json

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 3: Update the README license badge

**Files:**
- Modify: `README.md:4`

- [ ] **Step 1: Change the badge from ISC to MIT**

Current:

```markdown
[![License](https://img.shields.io/badge/license-ISC-green?style=flat-square)](LICENSE)
```

Change to:

```markdown
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README license badge to MIT

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

### Task 4: Sync VERSION and lock everything with a meta test

**Files:**
- Modify: `lib.js:185` (`VERSION`)
- Test: `tests/meta.test.js` (new)

- [ ] **Step 1: Write the failing tests**

Create `tests/meta.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const { VERSION } = require('../lib.js');

const ROOT = path.join(__dirname, '..');

test('lib VERSION matches package.json version', () => {
    assert.strictEqual(VERSION, pkg.version);
});

test('package.json declares the MIT license', () => {
    assert.strictEqual(pkg.license, 'MIT');
});

test('a LICENSE file exists and is MIT', () => {
    const lic = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
    assert.match(lic, /MIT License/);
    assert.match(lic, /Jacob Kanfer/);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/meta.test.js`
Expected: FAIL on the first test — `lib.js` `VERSION` is `'1.0.0'` while `package.json` is `'1.0.1'`. (Tasks 1–2 must be merged first for the license/LICENSE assertions to pass.)

- [ ] **Step 3: Sync the VERSION constant**

In `lib.js`, current:

```javascript
    const VERSION = '1.0.0';
```

Change to match `package.json` (`1.0.1`):

```javascript
    const VERSION = '1.0.1';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/meta.test.js`
Expected: PASS (all 3).

- [ ] **Step 5: Run the full suite (no regressions)**

Run: `node --test`
Expected: PASS, 0 failures.

- [ ] **Step 6: Commit**

```bash
git add lib.js tests/meta.test.js
git commit -m "test: lock lib VERSION + license consistency against drift

Generated with [Claude Code](https://claude.ai/code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

---

## Self-Review

- **Spec coverage:** Tasks 1-3 → Project Hub #4 (license mismatch + missing LICENSE); Task 4 → #7 (VERSION drift) plus a guard so #4 and #7 can't regress. ✅
- **Placeholder scan:** Full LICENSE text, exact JSON/markdown diffs, complete test file. ✅
- **Type consistency:** `meta.test.js` asserts `pkg.license === 'MIT'`, matching Task 2's change; the LICENSE regex matches Task 1's text (`MIT License`, `Jacob Kanfer`). ✅
- **Ordering note:** Task 4's test depends on Tasks 1–2 being done first (license + LICENSE). Execute in order 1 → 2 → 3 → 4. ✅
- **Author note:** Copyright holder is "Jacob Kanfer" per project identity rules — never "Katelyn". ✅
