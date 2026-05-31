// DOM integration tests — exercise the three browser-behaviour fixes that the
// pure unit tests can't reach: orientation redraw, single-fire keyboard
// shortcuts (double-init), and the grid-button cache. Runs script.js inside a
// jsdom window via indirect eval: lib.js attaches its functions to window, and
// script.js's top-level function declarations also become window globals (sloppy
// mode), so we can CALL them. Its top-level `let` variables stay private to the
// eval scope, so state is asserted against the DOM rather than read back.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const libSrc = fs.readFileSync(path.join(ROOT, 'lib.js'), 'utf8');
const appSrc = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');

function newDom() {
    return new JSDOM(html, {
        runScripts: 'outside-only',
        url: 'http://localhost/',
        pretendToBeVisual: true
    });
}

function makeApp() {
    const dom = newDom();
    const w = dom.window;
    w.scrollTo = () => {};
    try { w.localStorage.clear(); } catch (e) { /* hermetic start */ }
    w.eval(libSrc);   // attaches lib functions to window
    w.eval(appSrc);   // declares app globals; auto-init timing under jsdom is non-deterministic
    // Force a deterministic, synchronous init. Idempotent via the appInitialized guard,
    // so this is a no-op if the bottom-of-file block already ran initializeApp().
    w.eval('initializeApp()');
    return dom;
}

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

function buttons(w) {
    return [...w.document.querySelectorAll('#grid-container button')];
}
function litIndices(w) {
    return buttons(w).map((b, i) => (b.classList.contains('clicked') ? i : -1)).filter(i => i >= 0);
}

test('orientation redraw lights the exact clicked cell for every origin', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        for (const origin of ['top-left', 'top-right', 'bottom-left', 'bottom-right']) {
            w.eval(`updateOrientation('${origin}')`); // clears frames + rebuilds grid
            const btns = buttons(w);
            assert.strictEqual(btns.length, 64, `${origin}: expected 8x8 grid`);

            const k = 10; // a non-trivial interior index
            btns[k].click(); // stores coord via indexToRowCol, lights button k directly

            // applyFrameToGrid re-derives the DOM index via rowColToIndex — the path
            // that was scrambled before the fix. After it, only button k must be lit.
            w.eval('applyFrameToGrid()');

            assert.deepStrictEqual(litIndices(w), [k],
                `${origin}: redraw should light exactly the clicked cell`);
        }
    } finally {
        dom.window.close();
    }
});

test('a single Ctrl+Z undoes exactly one edit (no double-bound listener)', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        const btns = buttons(w);
        btns[5].click();
        btns[12].click();
        assert.strictEqual(litIndices(w).length, 2, 'two clicks should light two pixels');

        w.document.dispatchEvent(new w.KeyboardEvent('keydown', {
            key: 'z', ctrlKey: true, bubbles: true, cancelable: true
        }));

        // undo() redraws the grid from state, so the lit-cell count reflects the
        // undo depth. Double-bound listeners would fire undo twice -> 0 cells.
        assert.strictEqual(litIndices(w).length, 1,
            'one Ctrl+Z must undo exactly one edit (would be 0 if the listener were double-bound)');
    } finally {
        dom.window.close();
    }
});

test('appInitialized guard makes a repeat initializeApp() a no-op (no re-bound listeners)', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        // If the guard works this is a no-op; if it failed it would re-run setup and
        // bind a SECOND keydown handler, making one Ctrl+Z fire undo twice below.
        w.eval('initializeApp()');

        const btns = buttons(w);
        btns[5].click();
        btns[12].click();
        assert.strictEqual(litIndices(w).length, 2, 'two clicks should light two pixels');

        w.document.dispatchEvent(new w.KeyboardEvent('keydown', {
            key: 'z', ctrlKey: true, bubbles: true, cancelable: true
        }));

        assert.strictEqual(litIndices(w).length, 1,
            'after a repeat init, one Ctrl+Z still undoes exactly one edit (would be 0 if init re-bound the listener)');
    } finally {
        dom.window.close();
    }
});

test('grid-button cache is rebuilt on resize and drives applyFrameToGrid', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        w.document.getElementById('grid-width-input').value = '5';
        w.document.getElementById('grid-height-input').value = '5';
        w.eval('updateGridSize()'); // rebuilds grid + the gridButtons cache

        const btns = buttons(w);
        assert.strictEqual(btns.length, 25, 'resize should produce a 5x5 grid');

        btns[7].click();
        w.eval('applyFrameToGrid()'); // reads the cached gridButtons, not a fresh query

        assert.deepStrictEqual(litIndices(w), [7],
            'after a resize the cache must map index 7 to the same button on redraw');
    } finally {
        dom.window.close();
    }
});

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

test('undo restores grid orientation, not just the pixels', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        // Start from a known origin and light an interior, asymmetric cell.
        w.eval("updateOrientation('top-left')");
        const k = 10; // domRow 1, domCol 2 on an 8-wide grid — moves under a flip
        buttons(w)[k].click();
        assert.deepStrictEqual(litIndices(w), [k], 'precondition: cell k is lit under top-left');

        // Changing origin clears every frame; the pre-change snapshot still holds
        // the coord authored under top-left.
        w.eval("updateOrientation('top-right')");
        assert.strictEqual(litIndices(w).length, 0, 'origin change clears the frame');

        // Undo must bring back BOTH the pixel and the origin it was drawn under,
        // otherwise the restored coord renders through the wrong origin (mirrored).
        w.document.dispatchEvent(new w.KeyboardEvent('keydown', {
            key: 'z', ctrlKey: true, bubbles: true, cancelable: true
        }));

        assert.deepStrictEqual(litIndices(w), [k],
            'after undo the pixel returns to the exact clicked cell');
        const active = w.document.querySelector('.origin-btn.active');
        assert.strictEqual(active && active.getAttribute('data-orientation'), 'top-left',
            'after undo the origin selector returns to top-left');
    } finally {
        dom.window.close();
    }
});

test('Tab and Shift+Tab are trapped inside the Rust modal', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        w.eval('showFinishedModal()');
        const modal = w.document.getElementById('rust-modal');
        const focusables = [...modal.querySelectorAll(
            'button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter(el => !el.disabled);
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        assert.ok(focusables.length >= 2, 'modal should have multiple focusable controls');

        last.focus();
        const fwd = new w.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
        modal.dispatchEvent(fwd);
        assert.strictEqual(w.document.activeElement, first, 'Tab from last wraps to first');
        assert.ok(fwd.defaultPrevented, 'the wrap handler prevents the default Tab');

        first.focus();
        const back = new w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
        modal.dispatchEvent(back);
        assert.strictEqual(w.document.activeElement, last, 'Shift+Tab from first wraps to last');
    } finally {
        dom.window.close();
    }
});

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
        // Pass literal 8x8 (the default grid) — GRID_WIDTH/HEIGHT are top-level
        // `let`s not visible to a fresh eval; generateRustCode still reads the
        // global `frames` via its own lexical scope.
        const code = w.eval('generateRustCode(200, 8, 8)');

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

test('click-drag paints every cell it passes over as a single undo step', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        const btns = buttons(w);
        const md = (el) => el.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
        const me = (el) => el.dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: false }));
        const mu = () => w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true }));

        md(btns[0]); me(btns[1]); me(btns[2]); mu();
        assert.deepStrictEqual(litIndices(w), [0, 1, 2], 'a drag lights every cell it crosses');

        w.document.dispatchEvent(new w.KeyboardEvent('keydown', {
            key: 'z', ctrlKey: true, bubbles: true, cancelable: true
        }));
        assert.strictEqual(litIndices(w).length, 0,
            'one Ctrl+Z undoes the whole stroke (one saveState per stroke, not per cell)');
    } finally {
        dom.window.close();
    }
});

test('mouseenter with no stroke in progress paints nothing', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        buttons(w)[4].dispatchEvent(new w.MouseEvent('mouseenter', { bubbles: false }));
        assert.deepStrictEqual(litIndices(w), [], 'hovering without a held button must not paint');
    } finally {
        dom.window.close();
    }
});

test('resizing keeps in-bounds pixels and trims the rest', () => {
    const dom = makeApp();
    const w = dom.window;
    try {
        const btns = buttons(w);
        btns[0].click();   // (0,0) — survives a shrink to 4x4
        btns[63].click();  // (7,7) — off-grid after the shrink
        assert.strictEqual(litIndices(w).length, 2, 'two pixels before resize');

        w.document.getElementById('grid-width-input').value = '4';
        w.document.getElementById('grid-height-input').value = '4';
        w.eval('updateGridSize()');

        assert.strictEqual(buttons(w).length, 16, 'grid is now 4x4');
        assert.deepStrictEqual(litIndices(w), [0],
            'the in-bounds pixel survives the resize; the out-of-bounds one is trimmed');
    } finally {
        dom.window.close();
    }
});
