const test = require('node:test');
const assert = require('node:assert');
const { sanitizeFrameName } = require('../lib.js');

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
