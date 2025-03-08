const GRID_SIZE = 8;

let orientation = 'top-left';

function createGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = '';
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const button = document.createElement('button');
        button.textContent = " ";
        button.className = ""; 
        button.addEventListener('click', () => buttonClicked(button, i));
        container.appendChild(button);
    }
}

function updateOrientation(newOrientation) {
    orientation = newOrientation;
    console.log(`Orientation changed to: ${orientation}`);
    clearClickedButtons();
  }

function buttonClicked(button, index) {
    const coordinates = getButtonCoordinates(index);

    if (button.classList.contains('clicked')) {
        button.classList.remove('clicked');
        removeCoordinates(`${coordinates}`);
    } else {
        button.classList.add('clicked');
        console.log(`Button coordinates: ${coordinates}`);
        
        const clickedButtonsDisplay = document.getElementById('clicked-buttons');
        clickedButtonsDisplay.textContent += `${coordinates}, `;
    }
}

function removeCoordinates(coordinatesToRemove) {
    const clickedButtonsDisplay = document.getElementById('clicked-buttons');
    let currentCoordinates = clickedButtonsDisplay.textContent.trim();

    const regex = new RegExp(`\\(${coordinatesToRemove}\\),\\s?`, 'g');

    clickedButtonsDisplay.textContent = currentCoordinates.replace(regex, '').trim();
}

function clearClickedButtons() {
    const clickedButtonsDisplay = document.getElementById('clicked-buttons');
    clickedButtonsDisplay.textContent = '';
    
    const buttons = document.querySelectorAll('#grid-container button');
    buttons.forEach(button => {
        button.classList.remove('clicked');
    });
}

function getButtonCoordinates(index) {
    const rowSize = GRID_SIZE;
    let row, col;
    switch (orientation) {
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
