/**
 * NeoMatrix Frame Creator
 * Visual editor for designing LED matrix animations
 *
 * @author Technical-1
 * @license MIT
 */

/* ============================================
   State Management
   ============================================ */

let GRID_SIZE = 8;
let gridOrientation = "top-left";
let frames = [{ coords: [], name: "Frame 1" }];
let currentFrameIndex = 0;
let scrollInterval = null;
let scrollingInProgress = false;

/* ============================================
   Initialization
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Create initial grid
    createGrid();

    // Set up info panel toggle
    setupInfoPanel();

    // Set up keyboard navigation
    setupKeyboardNavigation();

    // Initialize orientation button state
    updateOrientationButtons();
}

/* ============================================
   Info Panel Toggle
   ============================================ */

function setupInfoPanel() {
    const toggle = document.getElementById('info-toggle');
    const panel = document.getElementById('info-panel');

    if (!toggle || !panel) return;

    toggle.addEventListener('click', () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', !isExpanded);
        panel.hidden = isExpanded;
    });
}

/* ============================================
   Keyboard Navigation
   ============================================ */

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Frame navigation with arrow keys when not in input
        if (document.activeElement.tagName === 'INPUT') return;

        switch(e.key) {
            case 'ArrowLeft':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    prevFrame();
                }
                break;
            case 'ArrowRight':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    nextFrame();
                }
                break;
            case ' ':
                if (e.target.tagName !== 'BUTTON') {
                    e.preventDefault();
                    toggleScroll();
                }
                break;
            case 'Escape':
                if (scrollingInProgress) {
                    stopScroll();
                }
                break;
        }
    });
}

/* ============================================
   Grid Creation & Rendering
   ============================================ */

/**
 * Dynamically creates an NxN grid of buttons (N = GRID_SIZE).
 * Uses CSS custom properties for responsive sizing.
 */
function createGrid() {
    const container = document.getElementById("grid-container");
    if (!container) return;

    // Clear existing children safely
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Set grid template using CSS custom property for cell size
    const cellSize = getComputedStyle(document.documentElement)
        .getPropertyValue('--cell-size').trim() || '2.75rem';

    container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, ${cellSize})`;
    container.style.gridTemplateRows = `repeat(${GRID_SIZE}, ${cellSize})`;

    // Create buttons with improved accessibility
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const btn = document.createElement("button");
        const { row, col } = indexToRowCol(i);

        btn.setAttribute('role', 'gridcell');
        btn.setAttribute('aria-label', `Cell row ${row}, column ${col}`);
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('data-index', i);

        btn.addEventListener("click", () => handleCellClick(btn, i));

        // Touch feedback
        btn.addEventListener('touchstart', () => btn.classList.add('touching'), { passive: true });
        btn.addEventListener('touchend', () => btn.classList.remove('touching'), { passive: true });

        container.appendChild(btn);
    }

    highlightCornerButton();
    applyFrameToGrid();
    updateFrameIndicator();
}

/**
 * Handles a click on a specific button in the grid.
 * Toggles the coordinate in our in-memory array and updates the UI.
 */
function handleCellClick(button, index) {
    const { row, col } = indexToRowCol(index);
    const activeFrame = frames[currentFrameIndex];

    const existing = activeFrame.coords.findIndex(pt => pt.row === row && pt.col === col);

    if (existing >= 0) {
        // Remove coordinate
        activeFrame.coords.splice(existing, 1);
        button.classList.remove("clicked");
        button.setAttribute('aria-pressed', 'false');
    } else {
        // Add coordinate
        activeFrame.coords.push({ row, col });
        button.classList.add("clicked");
        button.setAttribute('aria-pressed', 'true');
    }

    updateCoordinatesDisplay();
}

/**
 * Updates the orientation and clears any clicked buttons/coordinates.
 */
function updateOrientation(newOrientation) {
    gridOrientation = newOrientation;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;

    updateOrientationButtons();
    createGrid();

    showToast(`Origin set to ${newOrientation.replace('-', ' ')}`, 'success');
}

/**
 * Updates the active state of orientation buttons
 */
function updateOrientationButtons() {
    const buttons = document.querySelectorAll('.origin-btn');
    buttons.forEach(btn => {
        const orientation = btn.getAttribute('data-orientation');
        btn.classList.toggle('active', orientation === gridOrientation);
        btn.setAttribute('aria-checked', orientation === gridOrientation);
    });
}

/**
 * Reads the user's chosen grid size from the input, updates GRID_SIZE,
 * and regenerates the grid.
 */
function updateGridSize() {
    const input = document.getElementById("grid-size-input");
    const val = parseInt(input.value, 10);

    if (isNaN(val) || val < 1) {
        showToast("Grid size must be at least 1", 'error');
        input.value = GRID_SIZE;
        return;
    }

    if (val > 64) {
        showToast("Maximum grid size is 64", 'error');
        input.value = 64;
        return;
    }

    if (val === GRID_SIZE) return;

    GRID_SIZE = val;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;
    createGrid();

    showToast(`Grid resized to ${GRID_SIZE}x${GRID_SIZE}`, 'success');
}

/**
 * Updates the dot/marker for whichever button is row=0, col=0
 * in the current orientation.
 */
function highlightCornerButton() {
    const buttons = document.querySelectorAll("#grid-container button");
    buttons.forEach(b => b.classList.remove("corner-dot"));

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const coords = indexToRowCol(i);
        if (coords.row === 0 && coords.col === 0) {
            buttons[i].classList.add("corner-dot");
            break;
        }
    }
}

/* ============================================
   Frame Management
   ============================================ */

function newFrame() {
    frames.push({ coords: [], name: `Frame ${frames.length + 1}` });
    currentFrameIndex = frames.length - 1;
    applyFrameToGrid();
    updateFrameIndicator();
    updateCoordinatesDisplay();

    showToast(`Created Frame ${frames.length}`, 'success');
}

function prevFrame() {
    if (currentFrameIndex > 0) {
        currentFrameIndex--;
        applyFrameToGrid();
        updateFrameIndicator();
        updateCoordinatesDisplay();
    }
}

function nextFrame() {
    if (currentFrameIndex < frames.length - 1) {
        currentFrameIndex++;
        applyFrameToGrid();
        updateFrameIndicator();
        updateCoordinatesDisplay();
    }
}

/**
 * Clear the current frame only
 */
function clearClickedButtons() {
    if (frames[currentFrameIndex].coords.length === 0) {
        showToast("Frame is already empty", 'error');
        return;
    }

    frames[currentFrameIndex].coords = [];
    applyFrameToGrid();
    updateCoordinatesDisplay();

    showToast("Frame cleared", 'success');
}

/**
 * Apply the active frame's coords to the grid display
 */
function applyFrameToGrid() {
    const buttons = document.querySelectorAll("#grid-container button");

    // Clear all
    buttons.forEach(b => {
        b.classList.remove("clicked");
        b.setAttribute('aria-pressed', 'false');
    });

    // Apply active frame
    const active = frames[currentFrameIndex];
    active.coords.forEach(pt => {
        const idx = rowColToIndex(pt.row, pt.col);
        if (idx >= 0 && idx < buttons.length) {
            buttons[idx].classList.add("clicked");
            buttons[idx].setAttribute('aria-pressed', 'true');
        }
    });
}

/**
 * Refreshes the coordinates display based on the current frame.
 */
function updateCoordinatesDisplay() {
    const disp = document.getElementById("clicked-buttons");
    if (!disp) return;

    const active = frames[currentFrameIndex];

    if (active.coords.length === 0) {
        disp.textContent = "Click cells to select pixels";
        return;
    }

    const lines = active.coords.map(pt => `(${pt.row},${pt.col})`);
    disp.textContent = lines.join(" ");
}

function updateFrameIndicator() {
    const el = document.getElementById("frame-indicator");
    if (!el) return;
    el.textContent = `Frame ${currentFrameIndex + 1}/${frames.length}`;
}

/* ============================================
   Orientation Mapping
   ============================================ */

function indexToRowCol(index) {
    switch (gridOrientation) {
        case "top-left":
            return {
                row: Math.floor(index / GRID_SIZE),
                col: index % GRID_SIZE
            };
        case "top-right":
            return {
                row: (GRID_SIZE - 1) - (index % GRID_SIZE),
                col: Math.floor(index / GRID_SIZE)
            };
        case "bottom-left":
            return {
                row: index % GRID_SIZE,
                col: (GRID_SIZE - 1) - Math.floor(index / GRID_SIZE)
            };
        case "bottom-right":
            return {
                row: (GRID_SIZE - 1) - Math.floor(index / GRID_SIZE),
                col: (GRID_SIZE - 1) - (index % GRID_SIZE)
            };
        default:
            return {
                row: Math.floor(index / GRID_SIZE),
                col: index % GRID_SIZE
            };
    }
}

function rowColToIndex(r, c) {
    switch (gridOrientation) {
        case "top-left":
            return r * GRID_SIZE + c;
        case "top-right":
            return (GRID_SIZE - 1 - c) * GRID_SIZE + r;
        case "bottom-left":
            return c * GRID_SIZE + (GRID_SIZE - 1 - r);
        case "bottom-right":
            return (GRID_SIZE - 1 - r) * GRID_SIZE + (GRID_SIZE - 1 - c);
        default:
            return r * GRID_SIZE + c;
    }
}

/* ============================================
   Scrolling Animation
   ============================================ */

/**
 * Toggle scroll animation on/off
 */
function toggleScroll() {
    if (scrollingInProgress) {
        stopScroll();
    } else {
        startScroll();
    }
}

function startScroll() {
    if (scrollingInProgress) return;
    scrollingInProgress = true;

    // Update play button state
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.classList.add('playing');
        playBtn.querySelector('.icon-play').style.display = 'none';
        playBtn.querySelector('.icon-stop').style.display = 'block';
    }

    // Build one 'megaframe' from all frames
    const megaCoords = buildMegaFrame();
    if (!megaCoords.length) {
        showToast("No pixels to animate", 'error');
        stopScroll();
        return;
    }

    // Find bounding box (minCol, maxCol)
    let minC = Infinity, maxC = -Infinity;
    megaCoords.forEach(pt => {
        if (pt.col < minC) minC = pt.col;
        if (pt.col > maxC) maxC = pt.col;
    });

    // Start offset so that left edge is just beyond the right side
    let offset = GRID_SIZE - minC;

    let delay = parseInt(document.getElementById("delay-input").value, 10);
    if (isNaN(delay) || delay < 50) delay = 200;

    scrollInterval = setInterval(() => {
        renderMegaCoords(megaCoords, offset);

        if (offset + maxC < 0) {
            // Loop back to start
            offset = GRID_SIZE - minC;
        } else {
            offset--;
        }
    }, delay);
}

function stopScroll() {
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    scrollingInProgress = false;

    // Update play button state
    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.classList.remove('playing');
        playBtn.querySelector('.icon-play').style.display = 'block';
        playBtn.querySelector('.icon-stop').style.display = 'none';
    }

    applyFrameToGrid();
}

/**
 * Lays out each frame with no horizontal gap,
 * building a single array of coords (megaCoords).
 */
function buildMegaFrame() {
    const result = [];
    let currentX = 0;

    frames.forEach((frame) => {
        if (!frame.coords.length) return;

        // Bounding box for this frame
        let minC = Infinity, maxC = -Infinity;
        frame.coords.forEach(pt => {
            if (pt.col < minC) minC = pt.col;
            if (pt.col > maxC) maxC = pt.col;
        });
        const width = (maxC - minC + 2);

        // Shift each col so the frame's minC starts at currentX
        frame.coords.forEach(pt => {
            const newCol = pt.col - minC + currentX;
            result.push({ row: pt.row, col: newCol });
        });

        // Move currentX for next frame
        currentX += width;
    });

    return result;
}

/**
 * Renders the merged coords at the given offset.
 */
function renderMegaCoords(coords, offset) {
    const buttons = document.querySelectorAll("#grid-container button");
    buttons.forEach(b => b.classList.remove("clicked"));

    coords.forEach(pt => {
        const shiftedCol = pt.col + offset;
        if (shiftedCol >= 0 && shiftedCol < GRID_SIZE) {
            const idx = rowColToIndex(pt.row, shiftedCol);
            if (idx >= 0 && idx < buttons.length) {
                buttons[idx].classList.add("clicked");
            }
        }
    });
}

/* ============================================
   Export Functions
   ============================================ */

/**
 * Copies the current coordinates to the clipboard in JSON format.
 */
function copyCoordinates() {
    const data = {
        gridSize: GRID_SIZE,
        orientation: gridOrientation,
        frames: frames.map(f => ({ name: f.name, coords: f.coords }))
    };
    const json = JSON.stringify(data, null, 2);

    navigator.clipboard.writeText(json)
        .then(() => showToast("Copied to clipboard!", 'success'))
        .catch(err => {
            console.error("Clipboard copy failed:", err);
            showToast("Failed to copy", 'error');
        });
}

/**
 * Prompts a file download in JSON format.
 */
function downloadJSON() {
    const data = {
        gridSize: GRID_SIZE,
        orientation: gridOrientation,
        frames: frames.map(f => ({ name: f.name, coords: f.coords }))
    };
    const jsonStr = JSON.stringify(data, null, 2);

    downloadFile(jsonStr, "frames.json", "application/json");
    showToast("Downloaded frames.json", 'success');
}

/**
 * Prompts a Rust file download
 */
function downloadRustFile() {
    const sizeValue = parseInt(document.getElementById("grid-size-input").value, 10) || 8;
    const w = sizeValue;
    const h = sizeValue;

    const delayValue = parseInt(document.getElementById("delay-input").value, 10) || 150;
    const scrollSpeed = delayValue;

    const rustContent = generateRustCode(scrollSpeed, w, h);

    downloadFile(rustContent, "nm_scroll_frames.rs", "text/plain");
    showToast("Downloaded nm_scroll_frames.rs", 'success');
}

/**
 * Helper function to download a file
 */
function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Generates the Rust source code for the NmScroll struct.
 */
function generateRustCode(scrollSpeed, width, height) {
    let code = `use smart_leds::RGB8;

pub const WIDTH: usize = ${width};
pub const HEIGHT: usize = ${height};

pub struct NmScroll {
    strip: [RGB8; WIDTH * HEIGHT],
    frame: isize,
    color: RGB8,
}

impl NmScroll {
    pub fn new(color: RGB8) -> Self {
        Self {
            strip: [RGB8::new(0, 0, 0); WIDTH * HEIGHT],
            frame: 0,
            color,
        }
    }

    pub fn clear(&mut self) {
        for px in &mut self.strip {
            *px = RGB8::new(0, 0, 0);
        }
    }

    pub fn set(&mut self, x: usize, y: usize) {
        if x < WIDTH && y < HEIGHT {
            self.strip[y * WIDTH + x] = self.color;
        }
    }

    pub fn to_list(&self) -> [RGB8; WIDTH * HEIGHT] {
        self.strip
    }

    fn draw_frame(&mut self, frame: &[(usize, usize)], offset_x: isize) {
        for &(x, y) in frame.iter() {
            let x_pos = x as isize + offset_x;
            if x_pos >= 0 && x_pos < WIDTH as isize {
                self.set(x_pos as usize, y);
            }
        }
    }
`;

    // Define const arrays for each frame
    frames.forEach((frame, i) => {
        const arrItems = frame.coords
            .map(({ row, col }) => `(${col}, ${row})`)
            .join(", ");
        code += `
    // ${frame.name}
    const FRAME_${i + 1}: &[(usize, usize)] = &[${arrItems}];
`;
    });

    code += `
    pub fn next(&mut self) {
        self.clear();

        let scroll_increment: isize = ${scrollSpeed};

        // We'll place frames consecutively (with 1-col gap).
        // current_x tracks the start col for the next frame.
        let mut current_x: isize = 0;

        // total_width is how many columns wide the merged frames are
        let mut total_width: isize = 0;

        // Create an array of references to frames
        let frames_data: [&[(usize, usize)]; ${frames.length}] = [
`;
    frames.forEach((_, i) => {
        code += `            FRAME_${i + 1},\n`;
    });
    code += `        ];\n\n`;

    code += `
        for (i, frame_data) in frames_data.iter().enumerate() {
            // bounding box
            let mut frame_min = isize::MAX;
            let mut frame_max = isize::MIN;
            for &(x, _y) in (*frame_data).iter() {
                if x as isize < frame_min { frame_min = x as isize; }
                if x as isize > frame_max { frame_max = x as isize; }
            }
            let width_of_frame = (frame_max - frame_min + 1);
            let offset_x = (current_x - frame_min) - self.frame;

            // Draw
            self.draw_frame(frame_data, offset_x);

            // 1-col gap
            current_x += width_of_frame + 1;

            if i == frames_data.len() - 1 {
                total_width = current_x;
            }
        }

        // Advance self.frame by scroll_increment
        self.frame += scroll_increment;

        // Once we've scrolled past the entire shape, loop back
        let loop_length = total_width + WIDTH as isize;
        if self.frame >= loop_length {
            self.frame = 0;
        }
    }
}
`;

    return code;
}

/* ============================================
   Toast Notifications
   ============================================ */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {string} type - 'success' or 'error'
 */
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');

    container.appendChild(toast);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 200);
    }, 3000);
}

/* ============================================
   Initialize on Load
   ============================================ */

// Fallback for browsers that fire DOMContentLoaded before script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
