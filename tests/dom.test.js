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
const { JSDOM } = require('jsdom');

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
