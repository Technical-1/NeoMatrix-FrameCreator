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
    highlightCornerButton();
}

/**
 * Updates the dot/marker for whichever button is row=0, col=0
 * in the current orientation.
 */
function highlightCornerButton() {
    // Remove old corner-dot markers from all buttons
    const allButtons = document.querySelectorAll("#grid-container button");
    allButtons.forEach(btn => {
        btn.classList.remove("corner-dot");
        if (btn.textContent === "•") {
            btn.textContent = " ";
        }
    });

    // Find the button whose getButtonCoordinates(index) => (row=0, col=0)
    const totalCells = GRID_SIZE * GRID_SIZE;
    for (let index = 0; index < totalCells; index++) {
        const coords = getButtonCoordinates(index);
        if (coords.row === 0 && coords.col === 0) {
            // This is our corner
            const cornerButton = allButtons[index];
            cornerButton.classList.add("corner-dot");
            cornerButton.textContent = "•"; // or “O” or something else
            break;
        }
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
    createGrid();
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

/**
 * Copies the current coordinates to the clipboard in JSON format.
 */
function copyCoordinates() {
    const data = {
        coordinates: clickedCoordinates
    };

    const jsonStr = JSON.stringify(data, null, 2);

    navigator.clipboard.writeText(jsonStr).then(() => {
        alert("Coordinates copied to clipboard!");
    }).catch((err) => {
        console.error("Failed to copy: ", err);
    });
}

/**
 * Prompts a file download in JSON format (coordinates.json).
 */
function downloadJSON() {
    const data = {
        coordinates: clickedCoordinates
    };
    const jsonStr = JSON.stringify(data, null, 2);

    // Create a Blob of the data
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Create a temporary link to prompt download
    const link = document.createElement("a");
    link.href = url;
    link.download = "coordinates.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * CSV download (coordinates.csv).
 */
function downloadCSV() {
    // Convert the array of {row, col} to CSV lines
    const csvLines = clickedCoordinates.map(coord => `${coord.row},${coord.col}`);
    const csvContent = csvLines.join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "coordinates.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

createGrid();
