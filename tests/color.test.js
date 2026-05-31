const test = require('node:test');
const assert = require('node:assert');
const { isValidHexColor, normalizeColor, parseHexColor } = require('../lib.js');

test('isValidHexColor accepts 6-digit hex with or without hash', () => {
    assert.ok(isValidHexColor('#00f0ff'));
    assert.ok(isValidHexColor('00F0FF'));
});

test('isValidHexColor rejects short, named, or null colours', () => {
    assert.ok(!isValidHexColor('#fff'));
    assert.ok(!isValidHexColor('red'));
    assert.ok(!isValidHexColor(null));
});

test('normalizeColor adds a missing hash and falls back on garbage', () => {
    assert.strictEqual(normalizeColor('00f0ff', '#000000'), '#00f0ff');
    assert.strictEqual(normalizeColor('red', '#000000'), '#000000');
});

test('normalizeColor lowercases hex so it matches the colour picker value', () => {
    // The <input type="color"> always reports lowercase hex, but imported/legacy
    // data can carry uppercase. Normalising to lowercase lets handleCellClick's
    // `stored === ledColor` toggle-off comparison succeed regardless of source case.
    assert.strictEqual(normalizeColor('#00F0FF', '#000000'), '#00f0ff');
    assert.strictEqual(normalizeColor('AABBCC', '#000000'), '#aabbcc');
});

test('parseHexColor never returns NaN components', () => {
    const c = parseHexColor('not-a-color');
    assert.ok(Number.isFinite(c.r) && Number.isFinite(c.g) && Number.isFinite(c.b));
});

test('parseHexColor parses RGB components correctly', () => {
    assert.deepStrictEqual(parseHexColor('#ff8000'), { r: 255, g: 128, b: 0 });
    assert.deepStrictEqual(parseHexColor('00f0ff'), { r: 0, g: 240, b: 255 });
});
