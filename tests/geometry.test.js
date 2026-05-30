const test = require('node:test');
const assert = require('node:assert');
const { indexToRowCol, rowColToIndex } = require('../lib.js');

const ORIENTATIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const SIZES = [[8, 8], [5, 3], [3, 5], [1, 64], [64, 1], [16, 9]];

test('rowColToIndex is the exact inverse of indexToRowCol', () => {
    for (const orientation of ORIENTATIONS) {
        for (const [w, h] of SIZES) {
            for (let i = 0; i < w * h; i++) {
                const { row, col } = indexToRowCol(i, w, h, orientation);
                const back = rowColToIndex(row, col, w, h, orientation);
                assert.strictEqual(back, i,
                    `${orientation} ${w}x${h}: index ${i} -> (${row},${col}) -> ${back}`);
            }
        }
    }
});

test('indexToRowCol stays within logical bounds', () => {
    for (const orientation of ORIENTATIONS) {
        for (const [w, h] of SIZES) {
            for (let i = 0; i < w * h; i++) {
                const { row, col } = indexToRowCol(i, w, h, orientation);
                assert.ok(row >= 0 && row < h, `${orientation} ${w}x${h}: row ${row} OOB`);
                assert.ok(col >= 0 && col < w, `${orientation} ${w}x${h}: col ${col} OOB`);
            }
        }
    }
});

test('each origin maps logical (0,0) to the expected DOM corner', () => {
    const w = 4, h = 3;
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'top-left'), 0);
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'top-right'), w - 1);
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'bottom-left'), (h - 1) * w);
    assert.strictEqual(rowColToIndex(0, 0, w, h, 'bottom-right'), w * h - 1);
});
