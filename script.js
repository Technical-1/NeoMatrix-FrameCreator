let GRID_SIZE = 8;

let gridOrientation = 'top-left';
let clickedCoordinates = [];

/**
 * Dynamically creates an NxN grid of buttons (N = GRID_SIZE).
 * Also sets the CSS grid styles (columns/rows) using the current GRID_SIZE.
 */
function createGrid() {
    const container = document.getElementById("grid-container");
    container.innerHTML = "";

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
 * Handles a click on a specific button in the grid.
 * Toggles the coordinate in our in-memory array and updates the UI.
 */
function buttonClicked(button, index) {
    const { row, col } = getButtonCoordinates(index);

    const existingIndex = clickedCoordinates.findIndex(
        (coord) => coord.row === row && coord.col === col
    );

    if (existingIndex >= 0) {
        clickedCoordinates.splice(existingIndex, 1);
        button.classList.remove("clicked");
    } else {
        clickedCoordinates.push({ row, col });
        button.classList.add("clicked");
    }

    updateCoordinatesDisplay();
}

/**
 * Clears any clicked buttons in the grid and resets the displayed coordinates.
 */
function clearClickedButtons() {
    clickedCoordinates = [];
    
    const buttons = document.querySelectorAll('#grid-container button');
    buttons.forEach(button => {
        button.classList.remove('clicked');
    });

    updateCoordinatesDisplay();
}

/**
 * Refreshes the #clicked-buttons text content based on the clickedCoordinates array.
 */
function updateCoordinatesDisplay() {
    const display = document.getElementById("clicked-buttons");

    // Convert each { row, col } object to "(row, col)" string
    const coordsStrings = clickedCoordinates.map(
        (coord) => `(${coord.row}, ${coord.col})`
    );

    // Join them with a comma + space
    display.textContent = coordsStrings.join(", ");
}

function getButtonCoordinates(index) {
    const rowSize = GRID_SIZE;
    let row, col;
    switch (gridOrientation) {
        case 'top-left':
            row = Math.floor(index / rowSize);
            col = index % rowSize;
            break;
        case "top-right":
            row = (rowSize - 1) - (index % rowSize);
            col = Math.floor(index / rowSize);
            break;

        case "bottom-left":
            row = index % rowSize;
            col = (rowSize - 1) - Math.floor(index / rowSize);
            break;

        case "bottom-right":
            row = (rowSize - 1) - Math.floor(index / rowSize);
            col = (rowSize - 1) - (index % rowSize);
            break;

        default:
            row = Math.floor(index / rowSize);
            col = index % rowSize;
            break;
    }

    return {row, col};
}

createGrid();
