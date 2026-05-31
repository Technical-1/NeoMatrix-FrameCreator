const test = require('node:test');
const assert = require('node:assert');
const { sanitizeFrameName, nonEmptyFrames } = require('../lib.js');

test('strips newlines that would break a // comment', () => {
    const out = sanitizeFrameName('evil\n} fn hack() {');
    assert.ok(!out.includes('\n'));
    assert.ok(!out.includes('\r'));
});

test('collapses control characters to spaces and trims', () => {
    assert.strictEqual(sanitizeFrameName('Frame\r\n1\t'), 'Frame 1');
});

test('handles non-string input', () => {
    assert.strictEqual(sanitizeFrameName(null), '');
    assert.strictEqual(sanitizeFrameName(undefined), '');
    assert.strictEqual(sanitizeFrameName(42), '42');
});

test('nonEmptyFrames keeps only frames that have coords, preserving order', () => {
    const a = { name: 'A', coords: [{ row: 0, col: 0, color: '#fff' }] };
    const empty = { name: 'B', coords: [] };
    const c = { name: 'C', coords: [{ row: 1, col: 1, color: '#000' }] };
    assert.deepStrictEqual(nonEmptyFrames([a, empty, c]), [a, c]);
});

test('nonEmptyFrames tolerates missing/garbage coords', () => {
    assert.deepStrictEqual(nonEmptyFrames([{ name: 'x' }, null, { coords: 'nope' }]), []);
});

test('nonEmptyFrames returns an empty array when every frame is empty', () => {
    assert.deepStrictEqual(nonEmptyFrames([{ coords: [] }, { coords: [] }]), []);
});
