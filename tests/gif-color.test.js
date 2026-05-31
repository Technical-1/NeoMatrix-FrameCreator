const test = require('node:test');
const assert = require('node:assert');
const { buildGifPalette } = require('../lib.js');

test('palette never exceeds 256 colours or 8 bits', () => {
    const triples = [];
    for (let i = 0; i < 1000; i++) {
        triples.push([i % 256, (i * 7) % 256, (i * 13) % 256]);
    }
    const { table, colorBits } = buildGifPalette(triples, 256);
    assert.ok(colorBits <= 8, `colorBits ${colorBits} must be <= 8`);
    assert.ok(table.length <= 256 * 3, `table ${table.length} bytes must be <= 768`);
});

test('black is always palette index 0', () => {
    const { indexOf, table } = buildGifPalette([[255, 0, 0], [0, 255, 0]], 256);
    assert.strictEqual(indexOf(0, 0, 0), 0);
    assert.strictEqual(table[0], 0);
    assert.strictEqual(table[1], 0);
    assert.strictEqual(table[2], 0);
});

test('exact colours map back to their own entry', () => {
    const { indexOf, table } = buildGifPalette([[255, 0, 0]], 256);
    const ri = indexOf(255, 0, 0);
    assert.strictEqual(table[ri * 3], 255);
    assert.strictEqual(table[ri * 3 + 1], 0);
    assert.strictEqual(table[ri * 3 + 2], 0);
});

test('an unlisted colour maps to the nearest entry, not black', () => {
    const { indexOf } = buildGifPalette([[0, 0, 0], [255, 255, 255]], 256);
    const nearWhite = indexOf(250, 250, 250);
    const nearBlack = indexOf(5, 5, 5);
    assert.notStrictEqual(nearWhite, nearBlack);
    assert.strictEqual(nearBlack, 0); // closer to black
});

test('colorBits is a valid GIF GCT size (>= 1)', () => {
    const { colorBits } = buildGifPalette([[10, 20, 30]], 256);
    assert.ok(colorBits >= 1 && colorBits <= 8);
});
