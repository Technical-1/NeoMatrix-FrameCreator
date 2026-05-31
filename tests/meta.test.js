const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const { VERSION } = require('../lib.js');

const ROOT = path.join(__dirname, '..');

test('lib VERSION matches package.json version', () => {
    assert.strictEqual(VERSION, pkg.version);
});

test('package.json declares the MIT license', () => {
    assert.strictEqual(pkg.license, 'MIT');
});

test('a LICENSE file exists and is MIT', () => {
    const lic = fs.readFileSync(path.join(ROOT, 'LICENSE'), 'utf8');
    assert.match(lic, /MIT License/);
    assert.match(lic, /Jacob Kanfer/);
});
