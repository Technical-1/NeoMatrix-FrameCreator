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

    const VERSION = '1.0.0';

    return { VERSION, indexToRowCol, rowColToIndex };
});
