let GRID_SIZE = 8;

let gridOrientation = 'top-left';

/**
 * Dynamically creates an NxN grid of buttons (N = GRID_SIZE).
 * Also sets the CSS grid styles (columns/rows) using the current GRID_SIZE.
 */
function createGrid() {
    const container = document.getElementById("grid-container");
    container.innerHTML = "";  // Clear any existing grid

    // Dynamically set the grid columns and rows based on GRID_SIZE
    container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 50px)`;
    container.style.gridTemplateRows = `repeat(${GRID_SIZE}, 50px)`;

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const button = document.createElement("button");
        button.textContent = " ";
        button.className = "";
        button.addEventListener("click", () => buttonClicked(button, i));
        container.appendChild(button);
    }
}

/**
 * Reads the user's chosen grid size from the input, updates GRID_SIZE,
 * and regenerates the grid.
 */
function updateGridSize() {
    const input = document.getElementById("grid-size-input");
    const newSize = parseInt(input.value, 10);

    if (!isNaN(newSize) && newSize > 0) {
        GRID_SIZE = newSize;
        clearClickedButtons();
        createGrid();
        console.log(`Grid size updated to ${GRID_SIZE}x${GRID_SIZE}`);
    } else {
        console.warn("Invalid grid size entered.");
    }
}

/**
 * Updates the orientation and clears any clicked buttons/coordinates
 * for consistency.
 */
function updateOrientation(newOrientation) {
    gridOrientation = newOrientation;
    console.log(`Orientation changed to: ${gridOrientation}`);
    clearClickedButtons();
  }

/**
 * Handles button clicks in the grid. Toggles the "clicked" class and
 * updates the coordinates display.
 */
function buttonClicked(button, index) {
    const coordinates = getButtonCoordinates(index);

    if (button.classList.contains('clicked')) {
        button.classList.remove('clicked');
        removeCoordinates(`${coordinates}`);
    } else {
        button.classList.add('clicked');
        console.log(`Button coordinates: ${coordinates}`);
        
        document.getElementById('clicked-buttons').textContent += `${coordinates}, `;
    }
}

/**
 * Removes a given coordinate string (e.g., "(3, 5)") from the display.
 */
function removeCoordinates(coordinatesToRemove) {
    const clickedButtonsDisplay = document.getElementById('clicked-buttons');
    let currentCoordinates = clickedButtonsDisplay.textContent.trim();

    const regex = new RegExp(`\\(${coordinatesToRemove}\\),\\s?`, 'g');

    clickedButtonsDisplay.textContent = currentCoordinates.replace(regex, '').trim();
}

/**
 * Clears any clicked buttons in the grid and resets the displayed coordinates.
 */
function clearClickedButtons() {
    document.getElementById('clicked-buttons').textContent = "";
    
    const buttons = document.querySelectorAll('#grid-container button');
    buttons.forEach(button => {
        button.classList.remove('clicked');
    });
}


function getButtonCoordinates(index) {
    const rowSize = GRID_SIZE;
    let row, col;
    switch (gridOrientation) {
        case 'top-left':
            row = Math.floor(index / rowSize);
            col = index % rowSize;
            break;
		case 'top-right':
            row = 7 - (index % rowSize);
            col = Math.floor(index / rowSize);
            break;
        case 'bottom-left':
            row = index % rowSize;
            col = 7 - Math.floor(index / rowSize);
            break;
        case 'bottom-right':
            row = 7 - Math.floor(index / rowSize);
            col = 7 - (index % rowSize);
            break;
        default:
            row = Math.floor(index / rowSize);
            col = index % rowSize;
    }
    return `(${row}, ${col})`;
}

createGrid();
