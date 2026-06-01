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

    // Frames that actually contribute pixels to the layout. Used by BOTH the
    // scrolling preview (buildMegaFrame) and the Rust generator so they agree on
    // which frames exist — an empty frame in the Rust output makes the scroll
    // loop compute width_of_frame from isize::MAX/MIN and overflow.
    function nonEmptyFrames(frames) {
        return (Array.isArray(frames) ? frames : [])
            .filter(f => f && Array.isArray(f.coords) && f.coords.length > 0);
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

    // Crop every frame's coords to a new grid size: keep pixels that still land on
    // a cell, drop those now outside [0,width) x [0,height). Used by the resize path
    // so shrinking the grid no longer wipes every frame — only the pixels that lost
    // their cell are removed. Returns NEW frame objects with fresh coords arrays (any
    // extra per-frame fields, e.g. name/duration, are preserved) so the caller can
    // assign the result without aliasing the originals.
    function clampFramesToGrid(frames, width, height) {
        return (Array.isArray(frames) ? frames : []).map(f => ({
            ...f,
            coords: (Array.isArray(f && f.coords) ? f.coords : []).filter(pt =>
                pt && Number.isFinite(pt.row) && Number.isFinite(pt.col)
                && pt.row >= 0 && pt.row < height
                && pt.col >= 0 && pt.col < width)
        }));
    }

    // Re-express every frame's coords so the lit cells stay in the SAME on-screen
    // position when the grid origin changes. A coord's DOM index under the old
    // origin is recomputed into a logical coord under the new origin; because
    // rowColToIndex and indexToRowCol are exact inverses, the picture is identical
    // while the stored/exported addressing follows the new corner. Returns new
    // frame objects (fresh coords, other fields like name/colour preserved).
    function reorientFrames(frames, width, height, fromOrigin, toOrigin) {
        const list = Array.isArray(frames) ? frames : [];
        if (fromOrigin === toOrigin) {
            return list.map(f => ({ ...f, coords: [...(f && f.coords || [])] }));
        }
        return list.map(f => ({
            ...f,
            coords: (Array.isArray(f && f.coords) ? f.coords : []).map(pt => {
                const domIndex = rowColToIndex(pt.row, pt.col, width, height, fromOrigin);
                const { row, col } = indexToRowCol(domIndex, width, height, toOrigin);
                return { ...pt, row, col };
            })
        }));
    }

    // --- Colour helpers (shared with later tasks) ---

    function isValidHexColor(hex) {
        return typeof hex === 'string' && /^#?[a-f\d]{6}$/i.test(hex);
    }

    function normalizeColor(hex, fallback) {
        if (!isValidHexColor(hex)) return fallback;
        // Lowercase so stored colours match the <input type="color"> value, which is
        // always lowercase — otherwise an uppercase imported '#00F0FF' never equals
        // the picker's '#00f0ff' and a click can't toggle that pixel off.
        const withHash = hex.charAt(0) === '#' ? hex : '#' + hex;
        return withHash.toLowerCase();
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

    // Build a GIF Global Color Table from RGB triples, capped at maxColors (<=256).
    // Black (0,0,0) is forced to index 0 (the renderer's background). When more
    // than maxColors distinct colours appear, the most frequent are kept and any
    // other colour resolves to its nearest palette entry by squared RGB distance —
    // so the header stays valid and overflow colours degrade gracefully instead of
    // turning black or corrupting colorBits.
    function buildGifPalette(rgbTriples, maxColors = 256) {
        const cap = Math.max(2, Math.min(256, maxColors));
        const freq = new Map();
        freq.set('0,0,0', Infinity); // pin black to the front
        for (const [r, g, b] of rgbTriples) {
            const k = r + ',' + g + ',' + b;
            freq.set(k, (freq.get(k) || 0) + 1);
        }

        const chosen = [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, cap)
            .map(([k]) => k.split(',').map(Number));

        const size = Math.max(2, Math.pow(2, Math.ceil(Math.log2(chosen.length))));
        const colorBits = Math.ceil(Math.log2(size));
        const table = new Uint8Array(size * 3);
        const exact = new Map();
        chosen.forEach(([r, g, b], i) => {
            table[i * 3] = r;
            table[i * 3 + 1] = g;
            table[i * 3 + 2] = b;
            exact.set(r + ',' + g + ',' + b, i);
        });

        function indexOf(r, g, b) {
            const hit = exact.get(r + ',' + g + ',' + b);
            if (hit !== undefined) return hit;
            let best = 0, bestD = Infinity;
            for (let i = 0; i < chosen.length; i++) {
                const [cr, cg, cb] = chosen[i];
                const d = (cr - r) * (cr - r) + (cg - g) * (cg - g) + (cb - b) * (cb - b);
                if (d < bestD) { bestD = d; best = i; }
            }
            return best;
        }

        return { table, colorBits, indexOf };
    }

    // --- Animation speed rules ---

    // Single source of truth for the speed-input rules. Returns whether the value
    // is accepted, the resulting speed, and whether it was clamped to the max — so
    // updateAnimationSpeed has one accept path and always restarts a running
    // animation (the old >2000 branch returned early and skipped the restart).
    function resolveSpeedInput(raw, current) {
        const n = parseInt(raw, 10);
        if (Number.isNaN(n) || n < 50) {
            return { accepted: false, speed: current, clampedToMax: false };
        }
        const clampedToMax = n > 2000;
        return { accepted: true, speed: Math.min(2000, n), clampedToMax };
    }

    // --- GIF export sizing ---

    // downloadGIF retains one full-resolution ImageData per scroll step, so memory
    // scales as width * height * 4 * steps. Cap the canvas resolution (shrinking the
    // per-cell size for large grids) and refuse exports whose bounded footprint
    // still blows the byte budget, instead of letting the tab allocate gigabytes.
    const GIF_DEFAULT_CELL = 32;
    const GIF_CELL_GAP = 4;
    const GIF_CELL_RADIUS = 6;
    const GIF_PADDING = 16;
    const GIF_CANVAS_CAP = 512;            // max canvas dimension in px
    const GIF_MAX_BYTES = 256 * 1024 * 1024; // 256 MB total ImageData budget

    function planGifExport(gridWidth, gridHeight, steps) {
        const maxGrid = Math.max(1, gridWidth, gridHeight);
        // Largest cell size that keeps the bigger grid dimension within the cap.
        const fit = Math.floor((GIF_CANVAS_CAP - 2 * GIF_PADDING + GIF_CELL_GAP) / maxGrid) - GIF_CELL_GAP;
        const cellSize = Math.max(1, Math.min(GIF_DEFAULT_CELL, fit));
        const cellRadius = Math.min(GIF_CELL_RADIUS, Math.floor(cellSize / 2));

        const dim = (cells) => cells * (cellSize + GIF_CELL_GAP) - GIF_CELL_GAP + GIF_PADDING * 2;
        const width = dim(gridWidth);
        const height = dim(gridHeight);

        const totalBytes = width * height * 4 * Math.max(0, steps);
        const ok = totalBytes <= GIF_MAX_BYTES;
        const reason = ok
            ? ''
            : `Animation too large to export (~${Math.round(totalBytes / (1024 * 1024))} MB). Reduce grid size, frame count, or speed.`;

        return { ok, reason, cellSize, cellGap: GIF_CELL_GAP, cellRadius, padding: GIF_PADDING, width, height };
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
                .filter(pt => pt && Number.isFinite(pt.row) && Number.isFinite(pt.col)
                    && pt.row >= 0 && pt.row < height
                    && pt.col >= 0 && pt.col < width)
                .map(pt => ({ row: pt.row, col: pt.col, color: normalizeColor(pt.color, ledColor) }))
        }));

        return { gridWidth: width, gridHeight: height, orientation, ledColor, animationSpeed, frames };
    }

    // Returns true when a visitor who has already seen the home page should be
    // sent straight to the editor. A `home` query param forces the home page to
    // stay (lets the story be revisited on demand); a leading "?" in `search`
    // is handled by URLSearchParams.
    function shouldRedirectHome(hasVisited, search) {
        return Boolean(hasVisited) && !new URLSearchParams(String(search || '')).has('home');
    }

    const VERSION = '1.0.1';

    return { VERSION, sanitizeFrameName, nonEmptyFrames, clampFramesToGrid, reorientFrames, indexToRowCol, rowColToIndex, isValidHexColor, normalizeColor, parseHexColor, resolveSpeedInput, planGifExport, clampDimension, validateImportedData, gifLzwEncode, buildGifPalette, shouldRedirectHome };
});
