const test = require('node:test');
const assert = require('node:assert');
const { clampFramesToGrid } = require('../lib.js');

test('keeps pixels that still fit when the grid shrinks', () => {
    const frames = [{ name: 'A', coords: [
        { row: 0, col: 0, color: '#fff' },
        { row: 7, col: 7, color: '#000' }, // off-grid after shrink to 4x4
        { row: 3, col: 3, color: '#abc' },
    ] }];
    const out = clampFramesToGrid(frames, 4, 4);
    assert.deepStrictEqual(out[0].coords, [
        { row: 0, col: 0, color: '#fff' },
        { row: 3, col: 3, color: '#abc' },
    ]);
});

test('keeps every pixel when the grid grows', () => {
    const frames = [{ name: 'A', coords: [{ row: 7, col: 7, color: '#fff' }] }];
    const out = clampFramesToGrid(frames, 16, 16);
    assert.strictEqual(out[0].coords.length, 1);
});

test('drops pixels on the new boundary (bounds are half-open)', () => {
    const frames = [{ coords: [
        { row: 0, col: 4, color: '#fff' }, // col === width -> out
        { row: 4, col: 0, color: '#fff' }, // row === height -> out
        { row: 3, col: 3, color: '#fff' }, // edge, in
    ] }];
    const out = clampFramesToGrid(frames, 4, 4);
    assert.deepStrictEqual(out[0].coords, [{ row: 3, col: 3, color: '#fff' }]);
});

test('preserves frame count and non-coord fields, returns fresh objects', () => {
    const frames = [
        { name: 'Keep', coords: [{ row: 0, col: 0, color: '#fff' }] },
        { name: 'Emptied', coords: [{ row: 9, col: 9, color: '#fff' }] },
    ];
    const out = clampFramesToGrid(frames, 4, 4);
    assert.strictEqual(out.length, 2, 'frame count is preserved (empties are kept)');
    assert.strictEqual(out[1].name, 'Emptied', 'non-coord fields survive');
    assert.deepStrictEqual(out[1].coords, [], 'all-off frame becomes empty, not dropped');
    assert.notStrictEqual(out[0].coords, frames[0].coords, 'coords arrays are fresh, not aliased');
});

test('drops non-finite / negative coords defensively', () => {
    const frames = [{ coords: [
        { row: -1, col: 0, color: '#fff' },
        { row: 0, col: NaN, color: '#fff' },
        { row: 1, col: 1, color: '#fff' },
    ] }];
    const out = clampFramesToGrid(frames, 4, 4);
    assert.deepStrictEqual(out[0].coords, [{ row: 1, col: 1, color: '#fff' }]);
});

test('tolerates garbage input', () => {
    assert.deepStrictEqual(clampFramesToGrid(null, 4, 4), []);
    assert.deepStrictEqual(clampFramesToGrid([{}], 4, 4), [{ coords: [] }]);
});
