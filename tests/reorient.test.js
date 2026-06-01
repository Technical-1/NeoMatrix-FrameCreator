const test = require('node:test');
const assert = require('node:assert');
const { reorientFrames, rowColToIndex } = require('../lib.js');

const ORIENTATIONS = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

test('reorient keeps every pixel on the same DOM cell for all origin pairs', () => {
    const w = 8, h = 8;
    const frames = [{ name: 'A', coords: [
        { row: 1, col: 2, color: '#fff' },
        { row: 7, col: 0, color: '#abc' },
        { row: 4, col: 6, color: '#0f0' },
    ] }];
    for (const from of ORIENTATIONS) {
        for (const to of ORIENTATIONS) {
            const out = reorientFrames(frames, w, h, from, to);
            out[0].coords.forEach((pt, i) => {
                const orig = frames[0].coords[i];
                assert.strictEqual(
                    rowColToIndex(pt.row, pt.col, w, h, to),
                    rowColToIndex(orig.row, orig.col, w, h, from),
                    `${from}->${to} pixel ${i} should stay on the same DOM cell`);
            });
        }
    }
});

test('reorient with the same origin returns equal-but-fresh coords', () => {
    const frames = [{ coords: [{ row: 3, col: 4, color: '#0f0' }] }];
    const out = reorientFrames(frames, 8, 8, 'top-left', 'top-left');
    assert.deepStrictEqual(out[0].coords, frames[0].coords);
    assert.notStrictEqual(out[0].coords, frames[0].coords, 'coords array must be a fresh copy');
});

test('reorient preserves colour and is reversible (rectangular grid)', () => {
    const w = 5, h = 3;
    const frames = [{ coords: [{ row: 2, col: 4, color: '#123456' }] }];
    const fwd = reorientFrames(frames, w, h, 'top-left', 'bottom-right');
    assert.strictEqual(fwd[0].coords[0].color, '#123456', 'colour survives');
    const back = reorientFrames(fwd, w, h, 'bottom-right', 'top-left');
    assert.deepStrictEqual(back[0].coords, frames[0].coords, 'A->B->A round-trips to the original');
});

test('reorient transforms every frame, not just the current one', () => {
    const w = 8, h = 8;
    const frames = [
        { coords: [{ row: 0, col: 0, color: '#fff' }] },
        { coords: [{ row: 1, col: 2, color: '#fff' }] },
    ];
    const out = reorientFrames(frames, w, h, 'top-left', 'top-right');
    assert.strictEqual(out.length, 2);
    // (0,0) under top-left is DOM 0 (top-left corner); under top-right that DOM cell
    // is logical (0, width-1).
    assert.deepStrictEqual(out[0].coords[0], { row: 0, col: 7, color: '#fff' });
});

test('reorient tolerates garbage input', () => {
    assert.deepStrictEqual(reorientFrames(null, 8, 8, 'top-left', 'top-right'), []);
    assert.deepStrictEqual(reorientFrames([{}], 8, 8, 'top-left', 'top-right'), [{ coords: [] }]);
});
