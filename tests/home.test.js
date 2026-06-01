// Contract test for the split between the home page (index.html) and the
// editor (app.html). jsdom parses the markup; we assert the wiring (links),
// not navigation side effects (runScripts is off, so inline scripts don't run).
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.join(__dirname, '..');
function dom(file) {
    return new JSDOM(fs.readFileSync(path.join(ROOT, file), 'utf8'));
}

test('home page Launch control navigates to the editor', () => {
    const d = dom('index.html');
    const launch = d.window.document.getElementById('launch-editor');
    assert.ok(launch, 'expected a #launch-editor element');
    assert.strictEqual(launch.getAttribute('href'), 'app.html');
});

test('home page loads lib.js and runs the redirect helper', () => {
    const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    assert.ok(html.includes('lib.js'), 'home page must load lib.js for the helper');
    assert.ok(html.includes('shouldRedirectHome'), 'home page must call shouldRedirectHome');
    assert.ok(html.includes("location.replace('app.html')"), 'home page must redirect to app.html');
});

test('editor exposes an About link back to the home story', () => {
    const d = dom('app.html');
    const about = d.window.document.querySelector('.header-actions a.home-link');
    assert.ok(about, 'expected an About link in the editor header');
    assert.strictEqual(about.getAttribute('href'), 'index.html?home=1');
});
