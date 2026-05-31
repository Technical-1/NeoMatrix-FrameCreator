const test = require('node:test');
const assert = require('node:assert');
const { resolveSpeedInput } = require('../lib.js');

// resolveSpeedInput centralises the speed-input rules so updateAnimationSpeed has
// a single accept path (and therefore always restarts a running animation, instead
// of the old >2000 branch that returned early and skipped the restart).

test('accepts an in-range speed unchanged', () => {
    assert.deepStrictEqual(resolveSpeedInput('500', 200),
        { accepted: true, speed: 500, clampedToMax: false });
});

test('rejects a sub-50 speed and keeps the current value', () => {
    assert.deepStrictEqual(resolveSpeedInput('10', 200),
        { accepted: false, speed: 200, clampedToMax: false });
});

test('rejects a non-numeric speed and keeps the current value', () => {
    assert.deepStrictEqual(resolveSpeedInput('abc', 200),
        { accepted: false, speed: 200, clampedToMax: false });
});

test('accepts but clamps a speed above 2000 to the max', () => {
    assert.deepStrictEqual(resolveSpeedInput('5000', 200),
        { accepted: true, speed: 2000, clampedToMax: true });
});

test('keeps the boundary values 50 and 2000', () => {
    assert.deepStrictEqual(resolveSpeedInput('50', 200),
        { accepted: true, speed: 50, clampedToMax: false });
    assert.deepStrictEqual(resolveSpeedInput('2000', 200),
        { accepted: true, speed: 2000, clampedToMax: false });
});
