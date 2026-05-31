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
