/**
 * NeoMatrix Frame Creator — pure logic library.
 * DOM-free. Loaded as a browser <script> (attaches to window) and require()-d by Node tests.
 */
(function (root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;          // Node / tests
    } else {
        Object.assign(root, api);      // Browser: expose as globals on window
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Rust code generation helpers ---

    function sanitizeFrameName(name) {
        const str = (name === null || name === undefined) ? '' : String(name);
        return str.replace(/[\r\n\x00-\x1F]+/g, ' ').trim();
    }

    // --- Coordinate geometry (corner-reflection origins) ---

    function indexToRowCol(index, width, height, orientation) {
        const domRow = Math.floor(index / width);
        const domCol = index % width;
        switch (orientation) {
            case 'top-right':
                return { row: domRow, col: (width - 1) - domCol };
            case 'bottom-left':
                return { row: (height - 1) - domRow, col: domCol };
            case 'bottom-right':
                return { row: (height - 1) - domRow, col: (width - 1) - domCol };
            case 'top-left':
            default:
                return { row: domRow, col: domCol };
        }
    }

    function rowColToIndex(row, col, width, height, orientation) {
        let domRow, domCol;
        switch (orientation) {
            case 'top-right':
                domRow = row; domCol = (width - 1) - col; break;
            case 'bottom-left':
                domRow = (height - 1) - row; domCol = col; break;
            case 'bottom-right':
                domRow = (height - 1) - row; domCol = (width - 1) - col; break;
            case 'top-left':
            default:
                domRow = row; domCol = col; break;
        }
        return domRow * width + domCol;
    }

    // --- Colour helpers (shared with later tasks) ---

    function isValidHexColor(hex) {
        return typeof hex === 'string' && /^#?[a-f\d]{6}$/i.test(hex);
    }

    function normalizeColor(hex, fallback) {
        if (!isValidHexColor(hex)) return fallback;
        return hex.charAt(0) === '#' ? hex : '#' + hex;
    }

    function parseHexColor(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
            : { r: 0, g: 240, b: 255 };
    }

    // --- GIF LZW compression (variable-width, LSB-first) ---

    function gifLzwEncode(pixels, colorBits) {
        const minCodeSize = Math.max(2, colorBits);
        const clearCode = 1 << minCodeSize;
        const eoiCode = clearCode + 1;

        let codeSize = minCodeSize + 1;
        let nextCode = eoiCode + 1;
        const maxCode = 4095;

        const dictionary = new Map();
        for (let i = 0; i < clearCode; i++) {
            dictionary.set(String(i), i);
        }

        const output = [];
        let buffer = 0;
        let bufferSize = 0;

        const writeCode = (code) => {
            buffer |= code << bufferSize;
            bufferSize += codeSize;
            while (bufferSize >= 8) {
                output.push(buffer & 0xff);
                buffer >>= 8;
                bufferSize -= 8;
            }
        };

        writeCode(clearCode);

        let current = String(pixels[0]);
        for (let i = 1; i < pixels.length; i++) {
            const next = String(pixels[i]);
            const combined = current + ',' + next;

            if (dictionary.has(combined)) {
                current = combined;
            } else {
                writeCode(dictionary.get(current));

                if (nextCode <= maxCode) {
                    dictionary.set(combined, nextCode++);
                    // Bump when nextCode exceeds 2^codeSize — keeps encoder in sync with the
                    // decoder, which bumps after dict.length reaches 2^codeSize (one entry earlier).
                    if (nextCode > (1 << codeSize) && codeSize < 12) {
                        codeSize++;
                    }
                }

                current = next;
            }
        }

        writeCode(dictionary.get(current));
        writeCode(eoiCode);

        if (bufferSize > 0) {
            output.push(buffer & 0xff);
        }

        return { data: new Uint8Array(output), minCodeSize };
    }

    // --- Import validation ---

    function clampDimension(value, fallback) {
        const n = parseInt(value, 10);
        if (Number.isNaN(n)) return fallback;
        return Math.max(1, Math.min(64, n));
    }

    function validateImportedData(data, defaults) {
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('Invalid format: not an object');
        }
        if (!Array.isArray(data.frames) || data.frames.length === 0) {
            throw new Error('Invalid format: frames must be a non-empty array');
        }

        // Use `!= null` (not truthiness) so an explicit 0 is treated as provided
        // and clamped to the 1-64 range, rather than silently keeping the default.
        let width = defaults.gridWidth;
        let height = defaults.gridHeight;
        if (data.gridSize != null) { width = data.gridSize; height = data.gridSize; } // legacy square grids
        if (data.gridWidth != null) width = data.gridWidth;
        if (data.gridHeight != null) height = data.gridHeight;
        width = clampDimension(width, defaults.gridWidth);
        height = clampDimension(height, defaults.gridHeight);

        const validOrientations = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        const orientation = validOrientations.includes(data.orientation)
            ? data.orientation : defaults.orientation;

        const ledColor = normalizeColor(data.ledColor, defaults.ledColor);

        let animationSpeed = parseInt(data.animationSpeed, 10);
        if (Number.isNaN(animationSpeed)) animationSpeed = defaults.animationSpeed;
        animationSpeed = Math.max(50, Math.min(2000, animationSpeed));

        const frames = data.frames.map((f, i) => ({
            name: typeof (f && f.name) === 'string' ? f.name : `Frame ${i + 1}`,
            coords: (Array.isArray(f && f.coords) ? f.coords : [])
                .filter(pt => pt && Number.isFinite(pt.row) && Number.isFinite(pt.col))
                .map(pt => ({ row: pt.row, col: pt.col, color: normalizeColor(pt.color, ledColor) }))
        }));

        return { gridWidth: width, gridHeight: height, orientation, ledColor, animationSpeed, frames };
    }

    const VERSION = '1.0.1';

    return { VERSION, sanitizeFrameName, indexToRowCol, rowColToIndex, isValidHexColor, normalizeColor, parseHexColor, clampDimension, validateImportedData, gifLzwEncode };
});
