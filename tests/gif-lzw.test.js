const test = require('node:test');
const assert = require('node:assert');
const { gifLzwEncode } = require('../lib.js');

// Reference GIF LZW decoder: variable-width, LSB-first codes.
// Bumps code size when the table fills to 2^codeSize (mirrors a correct encoder).
function gifLzwDecode(bytes, minCodeSize) {
    const clearCode = 1 << minCodeSize;
    const eoiCode = clearCode + 1;
    let codeSize = minCodeSize + 1;
    let dict;
    const initDict = () => {
        dict = [];
        for (let i = 0; i < clearCode; i++) dict.push([i]);
        dict.push(null); // clear
        dict.push(null); // eoi
    };
    initDict();

    let bitBuffer = 0, bitCount = 0, pos = 0;
    const readCode = () => {
        while (bitCount < codeSize) {
            bitBuffer |= (bytes[pos++] | 0) << bitCount;
            bitCount += 8;
        }
        const code = bitBuffer & ((1 << codeSize) - 1);
        bitBuffer >>= codeSize;
        bitCount -= codeSize;
        return code;
    };

    const out = [];
    let prev = null;
    for (;;) {
        const code = readCode();
        if (code === clearCode) { initDict(); codeSize = minCodeSize + 1; prev = null; continue; }
        if (code === eoiCode) break;

        let entry;
        if (code < dict.length && dict[code]) entry = dict[code].slice();
        else if (prev) entry = prev.concat(prev[0]);
        else throw new Error('invalid first code: ' + code);

        out.push(...entry);
        if (prev) {
            dict.push(prev.concat(entry[0]));
            if (dict.length === (1 << codeSize) && codeSize < 12) codeSize++;
        }
        prev = entry;
    }
    return out;
}

test('LZW round-trips a short sequence', () => {
    const pixels = [0, 1, 1, 2, 3, 3, 3, 1, 0, 0, 2, 1];
    const { data, minCodeSize } = gifLzwEncode(pixels, 2);
    assert.deepStrictEqual(gifLzwDecode(data, minCodeSize), pixels);
});

test('LZW round-trips input that crosses code-size boundaries', () => {
    const pixels = [];
    for (let i = 0; i < 5000; i++) pixels.push(i % 16);
    const { data, minCodeSize } = gifLzwEncode(pixels, 4);
    assert.deepStrictEqual(gifLzwDecode(data, minCodeSize), pixels);
});

test('LZW handles a single-pixel image', () => {
    const { data, minCodeSize } = gifLzwEncode([0], 2);
    assert.deepStrictEqual(gifLzwDecode(data, minCodeSize), [0]);
});
