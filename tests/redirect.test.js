const test = require('node:test');
const assert = require('node:assert');
const { shouldRedirectHome } = require('../lib.js');

test('first visit (no flag) stays on the home page', () => {
    assert.strictEqual(shouldRedirectHome(null, ''), false);
    assert.strictEqual(shouldRedirectHome(undefined, ''), false);
    assert.strictEqual(shouldRedirectHome('', ''), false);
});

test('returning visitor with no ?home is redirected to the editor', () => {
    assert.strictEqual(shouldRedirectHome('1', ''), true);
    assert.strictEqual(shouldRedirectHome('1', '?foo=bar'), true);
});

test('returning visitor with ?home stays on the home page', () => {
    assert.strictEqual(shouldRedirectHome('1', '?home'), false);
    assert.strictEqual(shouldRedirectHome('1', '?home=1'), false);
    assert.strictEqual(shouldRedirectHome('1', '?x=1&home=1'), false);
});

test('handles missing/undefined search safely', () => {
    assert.strictEqual(shouldRedirectHome('1', undefined), true);
    assert.strictEqual(shouldRedirectHome('1', null), true);
});

test('an unrelated param containing "home" does not suppress the redirect', () => {
    assert.strictEqual(shouldRedirectHome('1', '?homepage=1'), true);
    assert.strictEqual(shouldRedirectHome('1', '?nothome=1'), true);
});
