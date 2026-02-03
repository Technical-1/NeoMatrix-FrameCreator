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

let GRID_WIDTH = 8;
let GRID_HEIGHT = 8;
let gridOrientation = "top-left";
let frames = [{ coords: [], name: "Frame 1" }];
let currentFrameIndex = 0;
let scrollInterval = null;
let scrollingInProgress = false;
let ledColor = "#00f0ff";
let animationSpeed = 200; // milliseconds per scroll step

// Undo/Redo stacks
let undoStack = [];
let redoStack = [];
const MAX_UNDO_STEPS = 50;

// LocalStorage key
const STORAGE_KEY = 'neomatrix-autosave';

/* ============================================
   Initialization
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Try to load from localStorage
    loadFromStorage();

    // Create initial grid
    createGrid();

    // Set up info panel toggle
    setupInfoPanel();

    // Set up keyboard navigation
    setupKeyboardNavigation();

    // Set up color picker
    setupColorPicker();

    // Initialize orientation button state
    updateOrientationButtons();

    // Render frame thumbnails
    renderFrameThumbnails();

    // Update undo/redo button states
    updateUndoRedoButtons();

    // Set up autosave
    setupAutosave();
}

/* ============================================
   LocalStorage Autosave
   ============================================ */

function setupAutosave() {
    // Save on page unload
    window.addEventListener('beforeunload', saveToStorage);

    // Periodic autosave every 30 seconds
    setInterval(saveToStorage, 30000);
}

function saveToStorage() {
    const data = {
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        orientation: gridOrientation,
        ledColor: ledColor,
        animationSpeed: animationSpeed,
        frames: frames,
        currentFrameIndex: currentFrameIndex
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Failed to save to localStorage:', e);
    }
}

function loadFromStorage() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            if (data.frames && data.frames.length > 0) {
                GRID_WIDTH = data.gridWidth || 8;
                GRID_HEIGHT = data.gridHeight || 8;
                gridOrientation = data.orientation || "top-left";
                ledColor = data.ledColor || "#00f0ff";
                animationSpeed = data.animationSpeed || 200;
                frames = data.frames;
                currentFrameIndex = Math.min(data.currentFrameIndex || 0, frames.length - 1);

                // Migrate old format: add color to coords if missing
                frames.forEach(frame => {
                    frame.coords = frame.coords.map(pt => ({
                        row: pt.row,
                        col: pt.col,
                        color: pt.color || ledColor
                    }));
                });

                // Update UI inputs
                const widthInput = document.getElementById('grid-width-input');
                const heightInput = document.getElementById('grid-height-input');
                const colorPicker = document.getElementById('color-picker');
                const speedInput = document.getElementById('speed-input');

                if (widthInput) widthInput.value = GRID_WIDTH;
                if (heightInput) heightInput.value = GRID_HEIGHT;
                if (colorPicker) colorPicker.value = ledColor;
                if (speedInput) speedInput.value = animationSpeed;

                updateCellColor(ledColor);
            }
        }
    } catch (e) {
        console.warn('Failed to load from localStorage:', e);
    }
}

/* ============================================
   Undo/Redo System
   ============================================ */

function saveState() {
    const state = {
        frames: JSON.parse(JSON.stringify(frames)),
        currentFrameIndex: currentFrameIndex,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT
    };

    undoStack.push(state);
    if (undoStack.length > MAX_UNDO_STEPS) {
        undoStack.shift();
    }

    // Clear redo stack when new action is taken
    redoStack = [];
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length === 0) return;

    // Save current state to redo stack
    const currentState = {
        frames: JSON.parse(JSON.stringify(frames)),
        currentFrameIndex: currentFrameIndex,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT
    };
    redoStack.push(currentState);

    // Restore previous state
    const prevState = undoStack.pop();
    restoreState(prevState);

    showToast('Undo', 'success');
}

function redo() {
    if (redoStack.length === 0) return;

    // Save current state to undo stack
    const currentState = {
        frames: JSON.parse(JSON.stringify(frames)),
        currentFrameIndex: currentFrameIndex,
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT
    };
    undoStack.push(currentState);

    // Restore redo state
    const nextState = redoStack.pop();
    restoreState(nextState);

    showToast('Redo', 'success');
}

function restoreState(state) {
    frames = state.frames;
    currentFrameIndex = Math.min(state.currentFrameIndex, frames.length - 1);

    if (state.gridWidth !== GRID_WIDTH || state.gridHeight !== GRID_HEIGHT) {
        GRID_WIDTH = state.gridWidth;
        GRID_HEIGHT = state.gridHeight;
        document.getElementById('grid-width-input').value = GRID_WIDTH;
        document.getElementById('grid-height-input').value = GRID_HEIGHT;
        createGrid();
    } else {
        applyFrameToGrid();
    }

    updateFrameIndicator();
    updateCoordinatesDisplay();
    renderFrameThumbnails();
    updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');

    if (undoBtn) undoBtn.disabled = undoStack.length === 0;
    if (redoBtn) redoBtn.disabled = redoStack.length === 0;
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
   Color Picker
   ============================================ */

function setupColorPicker() {
    const picker = document.getElementById('color-picker');
    const preview = document.getElementById('color-preview');

    if (!picker) return;

    // Initialize color
    updateCellColor(picker.value);
    if (preview) {
        preview.style.backgroundColor = picker.value;
        preview.style.color = picker.value;
    }

    picker.addEventListener('input', (e) => {
        ledColor = e.target.value;
        updateCellColor(ledColor);
        if (preview) {
            preview.style.backgroundColor = ledColor;
            preview.style.color = ledColor;
        }
        renderFrameThumbnails();
    });
}

function updateCellColor(color) {
    const root = document.documentElement;
    root.style.setProperty('--cell-on', color);

    // Calculate glow color with opacity
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    root.style.setProperty('--cell-on-glow', `rgba(${r}, ${g}, ${b}, 0.4)`);
}

/* ============================================
   Keyboard Navigation
   ============================================ */

function setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
        // Skip if in input field
        if (document.activeElement.tagName === 'INPUT') return;

        // Undo: Ctrl+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            undo();
            return;
        }

        // Redo: Ctrl+Y or Ctrl+Shift+Z
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
            e.preventDefault();
            redo();
            return;
        }

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

function createGrid() {
    const container = document.getElementById("grid-container");
    if (!container) return;

    // Clear existing children
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Get cell size from CSS
    const cellSize = getComputedStyle(document.documentElement)
        .getPropertyValue('--cell-size').trim() || '2.75rem';

    container.style.gridTemplateColumns = `repeat(${GRID_WIDTH}, ${cellSize})`;
    container.style.gridTemplateRows = `repeat(${GRID_HEIGHT}, ${cellSize})`;

    // Create buttons
    const totalCells = GRID_WIDTH * GRID_HEIGHT;
    for (let i = 0; i < totalCells; i++) {
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

function handleCellClick(button, index) {
    // Save state for undo
    saveState();

    const { row, col } = indexToRowCol(index);
    const activeFrame = frames[currentFrameIndex];

    const existing = activeFrame.coords.findIndex(pt => pt.row === row && pt.col === col);

    if (existing >= 0) {
        // If clicking same cell with same color, remove it
        // If clicking with different color, update the color
        if (activeFrame.coords[existing].color === ledColor) {
            activeFrame.coords.splice(existing, 1);
            button.classList.remove("clicked");
            button.style.removeProperty('--pixel-color');
            button.setAttribute('aria-pressed', 'false');
        } else {
            activeFrame.coords[existing].color = ledColor;
            button.style.setProperty('--pixel-color', ledColor);
        }
    } else {
        activeFrame.coords.push({ row, col, color: ledColor });
        button.classList.add("clicked");
        button.style.setProperty('--pixel-color', ledColor);
        button.setAttribute('aria-pressed', 'true');
    }

    updateCoordinatesDisplay();
    renderFrameThumbnails();
}

function updateOrientation(newOrientation) {
    saveState();

    gridOrientation = newOrientation;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;

    updateOrientationButtons();
    createGrid();
    renderFrameThumbnails();

    showToast(`Origin: ${newOrientation.replace('-', ' ')}`, 'success');
}

function updateOrientationButtons() {
    const buttons = document.querySelectorAll('.origin-btn');
    buttons.forEach(btn => {
        const orientation = btn.getAttribute('data-orientation');
        btn.classList.toggle('active', orientation === gridOrientation);
        btn.setAttribute('aria-checked', orientation === gridOrientation);
    });
}

function updateGridSize() {
    const widthInput = document.getElementById("grid-width-input");
    const heightInput = document.getElementById("grid-height-input");

    const newWidth = parseInt(widthInput.value, 10);
    const newHeight = parseInt(heightInput.value, 10);

    if (isNaN(newWidth) || newWidth < 1 || isNaN(newHeight) || newHeight < 1) {
        showToast("Size must be at least 1", 'error');
        widthInput.value = GRID_WIDTH;
        heightInput.value = GRID_HEIGHT;
        return;
    }

    if (newWidth > 64 || newHeight > 64) {
        showToast("Maximum size is 64", 'error');
        widthInput.value = Math.min(newWidth, 64);
        heightInput.value = Math.min(newHeight, 64);
        return;
    }

    if (newWidth === GRID_WIDTH && newHeight === GRID_HEIGHT) return;

    saveState();

    GRID_WIDTH = newWidth;
    GRID_HEIGHT = newHeight;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;
    createGrid();
    renderFrameThumbnails();

    showToast(`Grid: ${GRID_WIDTH}×${GRID_HEIGHT}`, 'success');
}

function highlightCornerButton() {
    const buttons = document.querySelectorAll("#grid-container button");
    buttons.forEach(b => b.classList.remove("corner-dot"));

    const totalCells = GRID_WIDTH * GRID_HEIGHT;
    for (let i = 0; i < totalCells; i++) {
        const coords = indexToRowCol(i);
        if (coords.row === 0 && coords.col === 0) {
            if (buttons[i]) buttons[i].classList.add("corner-dot");
            break;
        }
    }
}

/* ============================================
   Frame Management
   ============================================ */

function newFrame() {
    saveState();

    frames.push({ coords: [], name: `Frame ${frames.length + 1}` });
    currentFrameIndex = frames.length - 1;
    applyFrameToGrid();
    updateFrameIndicator();
    updateCoordinatesDisplay();
    renderFrameThumbnails();

    showToast(`Created Frame ${frames.length}`, 'success');
}

function duplicateFrame() {
    saveState();

    const currentFrame = frames[currentFrameIndex];
    const newFrameData = {
        coords: JSON.parse(JSON.stringify(currentFrame.coords)),
        name: `Frame ${frames.length + 1}`
    };

    frames.splice(currentFrameIndex + 1, 0, newFrameData);
    currentFrameIndex++;
    applyFrameToGrid();
    updateFrameIndicator();
    updateCoordinatesDisplay();
    renderFrameThumbnails();

    showToast('Frame duplicated', 'success');
}

function deleteFrame() {
    if (frames.length <= 1) {
        showToast("Can't delete last frame", 'error');
        return;
    }

    saveState();

    frames.splice(currentFrameIndex, 1);
    if (currentFrameIndex >= frames.length) {
        currentFrameIndex = frames.length - 1;
    }

    applyFrameToGrid();
    updateFrameIndicator();
    updateCoordinatesDisplay();
    renderFrameThumbnails();

    showToast('Frame deleted', 'success');
}

function prevFrame() {
    if (currentFrameIndex > 0) {
        currentFrameIndex--;
        applyFrameToGrid();
        updateFrameIndicator();
        updateCoordinatesDisplay();
        renderFrameThumbnails();
    }
}

function nextFrame() {
    if (currentFrameIndex < frames.length - 1) {
        currentFrameIndex++;
        applyFrameToGrid();
        updateFrameIndicator();
        updateCoordinatesDisplay();
        renderFrameThumbnails();
    }
}

function goToFrame(index) {
    if (index >= 0 && index < frames.length) {
        currentFrameIndex = index;
        applyFrameToGrid();
        updateFrameIndicator();
        updateCoordinatesDisplay();
        renderFrameThumbnails();
    }
}

function clearClickedButtons() {
    if (frames[currentFrameIndex].coords.length === 0) {
        showToast("Frame is empty", 'error');
        return;
    }

    saveState();

    frames[currentFrameIndex].coords = [];
    applyFrameToGrid();
    updateCoordinatesDisplay();
    renderFrameThumbnails();

    showToast("Frame cleared", 'success');
}

function applyFrameToGrid() {
    const buttons = document.querySelectorAll("#grid-container button");

    buttons.forEach(b => {
        b.classList.remove("clicked");
        b.style.removeProperty('--pixel-color');
        b.setAttribute('aria-pressed', 'false');
    });

    const active = frames[currentFrameIndex];
    active.coords.forEach(pt => {
        const idx = rowColToIndex(pt.row, pt.col);
        if (idx >= 0 && idx < buttons.length) {
            buttons[idx].classList.add("clicked");
            buttons[idx].style.setProperty('--pixel-color', pt.color || ledColor);
            buttons[idx].setAttribute('aria-pressed', 'true');
        }
    });
}

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
   Frame Thumbnails with Drag & Drop
   ============================================ */

function renderFrameThumbnails() {
    const container = document.getElementById('frames-list');
    if (!container) return;

    // Clear existing
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    // Calculate thumbnail grid size (max 8x8 preview)
    const thumbCols = Math.min(GRID_WIDTH, 8);
    const thumbRows = Math.min(GRID_HEIGHT, 8);
    const cellSizePx = Math.floor(44 / Math.max(thumbCols, thumbRows));

    frames.forEach((frame, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'frame-thumb' + (idx === currentFrameIndex ? ' active' : '');
        thumb.draggable = true;
        thumb.dataset.index = idx;

        // Create mini grid
        const grid = document.createElement('div');
        grid.className = 'frame-thumb-grid';
        grid.style.gridTemplateColumns = `repeat(${thumbCols}, ${cellSizePx}px)`;
        grid.style.gridTemplateRows = `repeat(${thumbRows}, ${cellSizePx}px)`;

        for (let r = 0; r < thumbRows; r++) {
            for (let c = 0; c < thumbCols; c++) {
                const cell = document.createElement('div');
                cell.className = 'frame-thumb-cell';

                // Check if this cell is lit and get its color
                const pixel = frame.coords.find(pt => pt.row === r && pt.col === c);
                if (pixel) {
                    cell.classList.add('on');
                    cell.style.backgroundColor = pixel.color || ledColor;
                }

                grid.appendChild(cell);
            }
        }

        // Label
        const label = document.createElement('span');
        label.className = 'frame-thumb-label';
        label.textContent = idx + 1;

        thumb.appendChild(grid);
        thumb.appendChild(label);

        // Click to select
        thumb.addEventListener('click', () => goToFrame(idx));

        // Drag events
        thumb.addEventListener('dragstart', handleDragStart);
        thumb.addEventListener('dragover', handleDragOver);
        thumb.addEventListener('dragenter', handleDragEnter);
        thumb.addEventListener('dragleave', handleDragLeave);
        thumb.addEventListener('drop', handleDrop);
        thumb.addEventListener('dragend', handleDragEnd);

        container.appendChild(thumb);
    });
}

let draggedFrameIndex = null;

function handleDragStart(e) {
    draggedFrameIndex = parseInt(this.dataset.index);
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    const targetIndex = parseInt(this.dataset.index);
    if (draggedFrameIndex !== null && draggedFrameIndex !== targetIndex) {
        saveState();

        // Reorder frames
        const [draggedFrame] = frames.splice(draggedFrameIndex, 1);
        frames.splice(targetIndex, 0, draggedFrame);

        // Update current index if needed
        if (currentFrameIndex === draggedFrameIndex) {
            currentFrameIndex = targetIndex;
        } else if (draggedFrameIndex < currentFrameIndex && targetIndex >= currentFrameIndex) {
            currentFrameIndex--;
        } else if (draggedFrameIndex > currentFrameIndex && targetIndex <= currentFrameIndex) {
            currentFrameIndex++;
        }

        renderFrameThumbnails();
        updateFrameIndicator();
        showToast('Frame moved', 'success');
    }
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.frame-thumb').forEach(el => {
        el.classList.remove('drag-over');
    });
    draggedFrameIndex = null;
}

/* ============================================
   Orientation Mapping
   ============================================ */

function indexToRowCol(index) {
    switch (gridOrientation) {
        case "top-left":
            return {
                row: Math.floor(index / GRID_WIDTH),
                col: index % GRID_WIDTH
            };
        case "top-right":
            return {
                row: (GRID_WIDTH - 1) - (index % GRID_WIDTH),
                col: Math.floor(index / GRID_WIDTH)
            };
        case "bottom-left":
            return {
                row: index % GRID_WIDTH,
                col: (GRID_HEIGHT - 1) - Math.floor(index / GRID_WIDTH)
            };
        case "bottom-right":
            return {
                row: (GRID_HEIGHT - 1) - Math.floor(index / GRID_WIDTH),
                col: (GRID_WIDTH - 1) - (index % GRID_WIDTH)
            };
        default:
            return {
                row: Math.floor(index / GRID_WIDTH),
                col: index % GRID_WIDTH
            };
    }
}

function rowColToIndex(r, c) {
    switch (gridOrientation) {
        case "top-left":
            return r * GRID_WIDTH + c;
        case "top-right":
            return (GRID_WIDTH - 1 - c) * GRID_WIDTH + r;
        case "bottom-left":
            return c * GRID_WIDTH + (GRID_HEIGHT - 1 - r);
        case "bottom-right":
            return (GRID_HEIGHT - 1 - r) * GRID_WIDTH + (GRID_WIDTH - 1 - c);
        default:
            return r * GRID_WIDTH + c;
    }
}

/* ============================================
   Scrolling Animation
   ============================================ */

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

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.classList.add('playing');
        playBtn.querySelector('.icon-play').style.display = 'none';
        playBtn.querySelector('.icon-stop').style.display = 'block';
    }

    const megaCoords = buildMegaFrame();
    if (!megaCoords.length) {
        showToast("No pixels to animate", 'error');
        stopScroll();
        return;
    }

    let minC = Infinity, maxC = -Infinity;
    megaCoords.forEach(pt => {
        if (pt.col < minC) minC = pt.col;
        if (pt.col > maxC) maxC = pt.col;
    });

    let offset = GRID_WIDTH - minC;

    let delay = parseInt(document.getElementById("speed-input").value, 10);
    if (isNaN(delay) || delay < 50) delay = animationSpeed;

    scrollInterval = setInterval(() => {
        renderMegaCoords(megaCoords, offset);

        if (offset + maxC < 0) {
            offset = GRID_WIDTH - minC;
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

    const playBtn = document.getElementById('play-btn');
    if (playBtn) {
        playBtn.classList.remove('playing');
        playBtn.querySelector('.icon-play').style.display = 'block';
        playBtn.querySelector('.icon-stop').style.display = 'none';
    }

    applyFrameToGrid();
}

function buildMegaFrame() {
    const result = [];
    let currentX = 0;

    frames.forEach((frame) => {
        if (!frame.coords.length) return;

        let minC = Infinity, maxC = -Infinity;
        frame.coords.forEach(pt => {
            if (pt.col < minC) minC = pt.col;
            if (pt.col > maxC) maxC = pt.col;
        });
        const width = (maxC - minC + 2);

        frame.coords.forEach(pt => {
            const newCol = pt.col - minC + currentX;
            result.push({ row: pt.row, col: newCol, color: pt.color || ledColor });
        });

        currentX += width;
    });

    return result;
}

function renderMegaCoords(coords, offset) {
    const buttons = document.querySelectorAll("#grid-container button");
    buttons.forEach(b => {
        b.classList.remove("clicked");
        b.style.removeProperty('--pixel-color');
    });

    coords.forEach(pt => {
        const shiftedCol = pt.col + offset;
        if (shiftedCol >= 0 && shiftedCol < GRID_WIDTH) {
            const idx = rowColToIndex(pt.row, shiftedCol);
            if (idx >= 0 && idx < buttons.length) {
                buttons[idx].classList.add("clicked");
                buttons[idx].style.setProperty('--pixel-color', pt.color || ledColor);
            }
        }
    });
}

/* ============================================
   Import/Export Functions
   ============================================ */

function triggerImport() {
    document.getElementById('import-input').click();
}

function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.frames || !Array.isArray(data.frames)) {
                throw new Error('Invalid format: missing frames array');
            }

            saveState();

            // Load data
            if (data.gridWidth) GRID_WIDTH = data.gridWidth;
            if (data.gridHeight) GRID_HEIGHT = data.gridHeight;
            if (data.gridSize) {
                // Legacy support for square grids
                GRID_WIDTH = data.gridSize;
                GRID_HEIGHT = data.gridSize;
            }
            if (data.orientation) gridOrientation = data.orientation;
            if (data.animationSpeed) animationSpeed = data.animationSpeed;
            if (data.ledColor) ledColor = data.ledColor;

            frames = data.frames.map((f, i) => ({
                coords: (f.coords || []).map(pt => ({
                    row: pt.row,
                    col: pt.col,
                    color: pt.color || data.ledColor || ledColor
                })),
                name: f.name || `Frame ${i + 1}`
            }));

            currentFrameIndex = 0;

            // Update UI
            document.getElementById('grid-width-input').value = GRID_WIDTH;
            document.getElementById('grid-height-input').value = GRID_HEIGHT;
            updateOrientationButtons();
            createGrid();
            renderFrameThumbnails();

            showToast(`Imported ${frames.length} frames`, 'success');
        } catch (err) {
            console.error('Import error:', err);
            showToast('Invalid JSON file', 'error');
        }
    };
    reader.readAsText(file);

    // Reset input so same file can be re-imported
    event.target.value = '';
}

function copyCoordinates() {
    const data = getExportData();
    const json = JSON.stringify(data, null, 2);

    navigator.clipboard.writeText(json)
        .then(() => showToast("Copied to clipboard!", 'success'))
        .catch(err => {
            console.error("Clipboard copy failed:", err);
            showToast("Failed to copy", 'error');
        });
}

function downloadJSON() {
    const data = getExportData();
    const jsonStr = JSON.stringify(data, null, 2);
    downloadFile(jsonStr, "frames.json", "application/json");
    showToast("Downloaded frames.json", 'success');
}

function downloadCSV() {
    let csv = "frame,row,col,color\n";

    frames.forEach((frame, frameIdx) => {
        frame.coords.forEach(pt => {
            csv += `${frameIdx + 1},${pt.row},${pt.col},${pt.color || ledColor}\n`;
        });
    });

    downloadFile(csv, "frames.csv", "text/csv");
    showToast("Downloaded frames.csv", 'success');
}

function updateAnimationSpeed() {
    const input = document.getElementById("speed-input");
    const newSpeed = parseInt(input.value, 10);

    if (isNaN(newSpeed) || newSpeed < 50) {
        input.value = animationSpeed;
        showToast("Speed must be at least 50ms", 'error');
        return;
    }

    if (newSpeed > 2000) {
        input.value = 2000;
        animationSpeed = 2000;
        showToast("Speed set to max 2000ms", 'success');
        return;
    }

    animationSpeed = newSpeed;

    // If animation is running, restart with new speed
    if (scrollingInProgress) {
        stopScroll();
        startScroll();
    }
}

function downloadRustFile() {
    const w = GRID_WIDTH;
    const h = GRID_HEIGHT;

    const rustContent = generateRustCode(animationSpeed, w, h);
    downloadFile(rustContent, "nm_scroll_frames.rs", "text/plain");
    showToast("Downloaded nm_scroll_frames.rs", 'success');
}

function getExportData() {
    return {
        gridWidth: GRID_WIDTH,
        gridHeight: GRID_HEIGHT,
        orientation: gridOrientation,
        ledColor: ledColor,
        animationSpeed: animationSpeed,
        frames: frames.map(f => ({
            name: f.name,
            coords: f.coords.map(pt => ({
                row: pt.row,
                col: pt.col,
                color: pt.color
            }))
        }))
    };
}

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

// Helper to convert hex color to RGB components
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 0, g: 240, b: 255 };
}

function generateRustCode(scrollSpeed, width, height) {
    let code = `//! NeoMatrix Frame Animation
//! Generated by NeoMatrix Frame Creator
//! https://technical-1.github.io/NeoMatrix-FrameCreator/

use smart_leds::RGB8;

pub const WIDTH: usize = ${width};
pub const HEIGHT: usize = ${height};
pub const SCROLL_DELAY_MS: u32 = ${scrollSpeed};

/// Pixel data: (x, y, r, g, b)
type Pixel = (usize, usize, u8, u8, u8);

pub struct NmScroll {
    strip: [RGB8; WIDTH * HEIGHT],
    frame: isize,
}

impl NmScroll {
    pub fn new() -> Self {
        Self {
            strip: [RGB8::new(0, 0, 0); WIDTH * HEIGHT],
            frame: 0,
        }
    }

    pub fn clear(&mut self) {
        for px in &mut self.strip {
            *px = RGB8::new(0, 0, 0);
        }
    }

    pub fn set(&mut self, x: usize, y: usize, color: RGB8) {
        if x < WIDTH && y < HEIGHT {
            self.strip[y * WIDTH + x] = color;
        }
    }

    pub fn to_list(&self) -> [RGB8; WIDTH * HEIGHT] {
        self.strip
    }

    /// Get the recommended delay between scroll steps in milliseconds
    pub fn delay_ms() -> u32 {
        SCROLL_DELAY_MS
    }

    fn draw_frame(&mut self, frame: &[Pixel], offset_x: isize) {
        for &(x, y, r, g, b) in frame.iter() {
            let x_pos = x as isize + offset_x;
            if x_pos >= 0 && x_pos < WIDTH as isize {
                self.set(x_pos as usize, y, RGB8::new(r, g, b));
            }
        }
    }
`;

    frames.forEach((frame, i) => {
        const arrItems = frame.coords
            .map(({ row, col, color }) => {
                const rgb = hexToRgb(color || ledColor);
                return `(${col}, ${row}, ${rgb.r}, ${rgb.g}, ${rgb.b})`;
            })
            .join(", ");
        code += `
    // ${frame.name}
    const FRAME_${i + 1}: &'static [Pixel] = &[${arrItems}];
`;
    });

    code += `
    pub fn next(&mut self) {
        self.clear();

        let mut current_x: isize = 0;
        let mut total_width: isize = 0;

        let frames_data: [&[Pixel]; ${frames.length}] = [
`;
    frames.forEach((_, i) => {
        code += `            Self::FRAME_${i + 1},\n`;
    });
    code += `        ];\n\n`;

    code += `        for (i, frame_data) in frames_data.iter().enumerate() {
            let mut frame_min = isize::MAX;
            let mut frame_max = isize::MIN;
            for &(x, _y, _, _, _) in (*frame_data).iter() {
                if (x as isize) < frame_min { frame_min = x as isize; }
                if (x as isize) > frame_max { frame_max = x as isize; }
            }
            let width_of_frame = frame_max - frame_min + 1;
            let offset_x = (current_x - frame_min) - self.frame;

            self.draw_frame(frame_data, offset_x);
            current_x += width_of_frame + 1;

            if i == frames_data.len() - 1 {
                total_width = current_x;
            }
        }

        self.frame += 1;

        let loop_length = total_width + WIDTH as isize;
        if self.frame >= loop_length {
            self.frame = 0;
        }
    }
}

impl Default for NmScroll {
    fn default() -> Self {
        Self::new()
    }
}
`;

    return code;
}

/* ============================================
   GIF Export
   ============================================ */

// Simple GIF encoder for LED matrix animations
// Based on the GIF89a specification
class GifEncoder {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.frames = [];
    }

    addFrame(imageData, delay) {
        this.frames.push({ imageData, delay });
    }

    // Build color table from all frames
    buildColorTable() {
        const colors = new Map();
        colors.set('0,0,0', 0); // Black always first (background)

        this.frames.forEach(frame => {
            const data = frame.imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const key = `${data[i]},${data[i+1]},${data[i+2]}`;
                if (!colors.has(key)) {
                    colors.set(key, colors.size);
                }
            }
        });

        // Pad to power of 2
        const colorCount = Math.max(4, Math.pow(2, Math.ceil(Math.log2(colors.size))));
        const table = new Uint8Array(colorCount * 3);

        colors.forEach((index, key) => {
            const [r, g, b] = key.split(',').map(Number);
            table[index * 3] = r;
            table[index * 3 + 1] = g;
            table[index * 3 + 2] = b;
        });

        return { table, colors, colorBits: Math.ceil(Math.log2(colorCount)) };
    }

    // LZW compression
    lzwEncode(pixels, colorBits) {
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

    encode() {
        const { table, colors, colorBits } = this.buildColorTable();
        const parts = [];

        // Header
        parts.push(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])); // GIF89a

        // Logical Screen Descriptor
        const lsd = new Uint8Array(7);
        lsd[0] = this.width & 0xff;
        lsd[1] = (this.width >> 8) & 0xff;
        lsd[2] = this.height & 0xff;
        lsd[3] = (this.height >> 8) & 0xff;
        lsd[4] = 0x80 | ((colorBits - 1) << 4) | (colorBits - 1); // Global color table
        lsd[5] = 0; // Background color index
        lsd[6] = 0; // Pixel aspect ratio
        parts.push(lsd);

        // Global Color Table
        parts.push(table);

        // Netscape Application Extension (for looping)
        parts.push(new Uint8Array([
            0x21, 0xff, 0x0b,
            0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // NETSCAPE2.0
            0x03, 0x01, 0x00, 0x00, 0x00 // Loop forever
        ]));

        // Frames
        this.frames.forEach(frame => {
            // Graphic Control Extension
            const delay = Math.round(frame.delay / 10); // Convert ms to centiseconds
            parts.push(new Uint8Array([
                0x21, 0xf9, 0x04,
                0x00, // Disposal method
                delay & 0xff, (delay >> 8) & 0xff,
                0x00, // Transparent color index
                0x00
            ]));

            // Image Descriptor
            parts.push(new Uint8Array([
                0x2c,
                0x00, 0x00, 0x00, 0x00, // Position
                this.width & 0xff, (this.width >> 8) & 0xff,
                this.height & 0xff, (this.height >> 8) & 0xff,
                0x00 // No local color table
            ]));

            // Convert image data to indexed pixels
            const pixels = [];
            const data = frame.imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const key = `${data[i]},${data[i+1]},${data[i+2]}`;
                pixels.push(colors.get(key) || 0);
            }

            // LZW compressed data
            const { data: lzwData, minCodeSize } = this.lzwEncode(pixels, colorBits);
            parts.push(new Uint8Array([minCodeSize]));

            // Write in sub-blocks
            let offset = 0;
            while (offset < lzwData.length) {
                const blockSize = Math.min(255, lzwData.length - offset);
                parts.push(new Uint8Array([blockSize]));
                parts.push(lzwData.slice(offset, offset + blockSize));
                offset += blockSize;
            }
            parts.push(new Uint8Array([0x00])); // Block terminator
        });

        // Trailer
        parts.push(new Uint8Array([0x3b]));

        // Combine all parts
        const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        parts.forEach(part => {
            result.set(part, offset);
            offset += part.length;
        });

        return result;
    }
}

function downloadGIF() {
    if (frames.every(f => f.coords.length === 0)) {
        showToast("No pixels to export", 'error');
        return;
    }

    showToast("Generating GIF...", 'success');

    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            const scale = 10; // Each LED cell is 10x10 pixels in the GIF
            const gifWidth = GRID_WIDTH * scale;
            const gifHeight = GRID_HEIGHT * scale;

            const encoder = new GifEncoder(gifWidth, gifHeight);
            const canvas = document.createElement('canvas');
            canvas.width = gifWidth;
            canvas.height = gifHeight;
            const ctx = canvas.getContext('2d');

            // Build megaframe for scrolling animation
            const megaCoords = buildMegaFrame();

            if (megaCoords.length === 0) {
                showToast("No pixels to animate", 'error');
                return;
            }

            // Calculate bounds
            let minC = Infinity, maxC = -Infinity;
            megaCoords.forEach(pt => {
                if (pt.col < minC) minC = pt.col;
                if (pt.col > maxC) maxC = pt.col;
            });

            const totalScrollSteps = (maxC - minC) + GRID_WIDTH + 1;
            let offset = GRID_WIDTH - minC;

            // Generate frames for the animation
            for (let step = 0; step < totalScrollSteps; step++) {
                // Clear canvas
                ctx.fillStyle = '#0a0a0f';
                ctx.fillRect(0, 0, gifWidth, gifHeight);

                // Draw visible pixels
                megaCoords.forEach(pt => {
                    const shiftedCol = pt.col + offset;
                    if (shiftedCol >= 0 && shiftedCol < GRID_WIDTH) {
                        ctx.fillStyle = pt.color || ledColor;
                        ctx.fillRect(
                            shiftedCol * scale,
                            pt.row * scale,
                            scale - 1,
                            scale - 1
                        );
                    }
                });

                encoder.addFrame(ctx.getImageData(0, 0, gifWidth, gifHeight), animationSpeed);
                offset--;
            }

            const gifData = encoder.encode();
            const blob = new Blob([gifData], { type: 'image/gif' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = url;
            link.download = 'animation.gif';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            showToast("Downloaded animation.gif", 'success');
        } catch (e) {
            console.error('GIF generation error:', e);
            showToast("Failed to generate GIF", 'error');
        }
    }, 100);
}

/* ============================================
   Toast Notifications
   ============================================ */

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'status');

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 200);
    }, 2500);
}

/* ============================================
   Finished Modal
   ============================================ */

function showFinishedModal() {
    const modal = document.getElementById('rust-modal');
    const codeOutput = document.getElementById('rust-code-output');
    const statsContainer = document.getElementById('modal-stats');

    // Generate the Rust code
    const rustCode = generateRustCode(animationSpeed, GRID_WIDTH, GRID_HEIGHT);
    codeOutput.textContent = rustCode;

    // Calculate stats
    const totalPixels = frames.reduce((sum, f) => sum + f.coords.length, 0);
    const uniqueColors = new Set(
        frames.flatMap(f => f.coords.map(pt => pt.color || ledColor))
    ).size;

    // Display stats using safe DOM methods
    statsContainer.textContent = '';
    const stats = [
        { value: `${GRID_WIDTH}x${GRID_HEIGHT}`, label: 'grid' },
        { value: frames.length, label: `frame${frames.length !== 1 ? 's' : ''}` },
        { value: totalPixels, label: `pixel${totalPixels !== 1 ? 's' : ''}` },
        { value: uniqueColors, label: `color${uniqueColors !== 1 ? 's' : ''}` },
        { value: `${animationSpeed}ms`, label: 'speed' }
    ];

    stats.forEach(stat => {
        const span = document.createElement('span');
        span.className = 'modal-stat';
        const strong = document.createElement('strong');
        strong.textContent = stat.value;
        span.appendChild(strong);
        span.appendChild(document.createTextNode(' ' + stat.label));
        statsContainer.appendChild(span);
    });

    // Show modal
    modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // Focus trap
    modal.querySelector('.modal-close').focus();

    // Close on escape
    document.addEventListener('keydown', handleModalEscape);

    // Close on click outside
    modal.addEventListener('click', handleModalClickOutside);
}

function handleModalClickOutside(e) {
    if (e.target.classList.contains('modal-overlay')) {
        closeRustModal();
    }
}

function closeRustModal() {
    const modal = document.getElementById('rust-modal');
    modal.hidden = true;
    document.body.style.overflow = '';
    document.removeEventListener('keydown', handleModalEscape);
    modal.removeEventListener('click', handleModalClickOutside);
}

function handleModalEscape(e) {
    if (e.key === 'Escape') {
        closeRustModal();
    }
}

function copyRustCode() {
    const codeOutput = document.getElementById('rust-code-output');
    navigator.clipboard.writeText(codeOutput.textContent)
        .then(() => showToast("Copied to clipboard!", 'success'))
        .catch(() => showToast("Failed to copy", 'error'));
}

function downloadRustFromModal() {
    downloadRustFile();
    closeRustModal();
}

/* ============================================
   Initialize on Load
   ============================================ */

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
