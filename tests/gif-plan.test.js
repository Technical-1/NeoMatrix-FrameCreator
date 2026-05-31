const test = require('node:test');
const assert = require('node:assert');
const { planGifExport } = require('../lib.js');

// planGifExport bounds GIF export memory. downloadGIF retains one full-resolution
// ImageData per scroll step, so per-frame pixels * steps must stay bounded or a
// large grid / long animation can allocate hundreds of MB and crash the tab.

test('leaves small grids at full fidelity', () => {
    const plan = planGifExport(8, 8, 20);
    assert.strictEqual(plan.ok, true);
    assert.strictEqual(plan.cellSize, 32); // unchanged default
    assert.ok(plan.width <= 512 && plan.height <= 512);
});

test('shrinks the cell size so a large grid stays within the canvas cap', () => {
    const plan = planGifExport(64, 64, 40);
    assert.strictEqual(plan.ok, true);
    assert.ok(plan.cellSize < 32, 'large grids must scale cells down');
    assert.ok(plan.cellSize >= 1, 'cell size must remain a usable positive integer');
    assert.ok(plan.width <= 512 && plan.height <= 512,
        'the rendered canvas must stay within the resolution cap');
});

test('aborts when bounded per-frame pixels times step count exceeds the byte budget', () => {
    // Even after capping resolution, a pathological step count must be refused
    // rather than retained in memory frame-by-frame.
    const plan = planGifExport(64, 64, 1000000);
    assert.strictEqual(plan.ok, false);
    assert.ok(typeof plan.reason === 'string' && plan.reason.length > 0);
});

test('derives canvas dimensions from the chosen cell metrics', () => {
    const plan = planGifExport(8, 8, 10);
    const expectedW = 8 * (plan.cellSize + plan.cellGap) - plan.cellGap + plan.padding * 2;
    assert.strictEqual(plan.width, expectedW);
});
