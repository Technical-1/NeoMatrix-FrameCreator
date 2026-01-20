let GRID_SIZE = 8;
let gridOrientation = "top-left";

let frames = [{ coords: [], name: "Frame 1" }];
let currentFrameIndex = 0;

let scrollInterval = null;
let scrollingInProgress = false;

/* ===========================
   CREATE & RENDER THE GRID
=========================== */

/**
 * Dynamically creates an NxN grid of buttons (N = GRID_SIZE).
 * Also sets the CSS grid styles (columns/rows) using the current GRID_SIZE.
 */
function createGrid() {
  const container = document.getElementById("grid-container");
  container.innerHTML = "";

  container.style.gridTemplateColumns = `repeat(${GRID_SIZE}, 3.125rem)`;
  container.style.gridTemplateRows = `repeat(${GRID_SIZE}, 3.125rem)`;

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const btn = document.createElement("button");
    btn.textContent = " ";
    btn.addEventListener("click", () => handleCellClick(btn, i));
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
    // remove
    activeFrame.coords.splice(existing, 1);
    button.classList.remove("clicked");
  } else {
    // add
    activeFrame.coords.push({ row, col });
    button.classList.add("clicked");
  }

  updateCoordinatesDisplay();
}

/**
 * Updates the orientation and clears any clicked buttons/coordinates
 * for consistency.
 */
function updateOrientation(newOrientation) {
  gridOrientation = newOrientation;
  frames.forEach(f => f.coords = []);
  currentFrameIndex = 0;
  createGrid();
}

/**
 * Reads the user's chosen grid size from the input, updates GRID_SIZE,
 * and regenerates the grid.
 */
function updateGridSize() {
  const val = parseInt(document.getElementById("grid-size-input").value, 10);
  if (!isNaN(val) && val > 0) {
    GRID_SIZE = val;
    frames.forEach(f => f.coords = []);
    currentFrameIndex = 0;
    createGrid();
  }
}

/**
 * Updates the dot/marker for whichever button is row=0, col=0
 * in the current orientation.
 */
function highlightCornerButton() {
  const buttons = document.querySelectorAll("#grid-container button");
  buttons.forEach(b => {
    b.classList.remove("corner-dot");
    if (b.textContent === "•") b.textContent = " ";
  });

  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const coords = indexToRowCol(i);
    if (coords.row === 0 && coords.col === 0) {
      buttons[i].classList.add("corner-dot");
      buttons[i].textContent = "•";
      break;
    }
  }
}

/* ============================
   FRAMES: NEW, PREV, NEXT
============================ */
function newFrame() {
  frames.push({ coords: [], name: `Frame ${frames.length + 1}` });
  currentFrameIndex = frames.length - 1;
  applyFrameToGrid();
  updateFrameIndicator();
  updateCoordinatesDisplay();
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

/* Clear the current frame only */
function clearClickedButtons() {
  frames[currentFrameIndex].coords = [];
  applyFrameToGrid();
  updateCoordinatesDisplay();
}

/* Apply the active frame's coords to the grid display */
function applyFrameToGrid() {
  const buttons = document.querySelectorAll("#grid-container button");
  buttons.forEach(b => b.classList.remove("clicked"));

  const active = frames[currentFrameIndex];
  active.coords.forEach(pt => {
    const idx = rowColToIndex(pt.row, pt.col);
    if (idx >= 0 && idx < buttons.length) {
      buttons[idx].classList.add("clicked");
    }
  });
}

/**
 * Refreshes the #clicked-buttons text content based on the clickedCoordinates array.
 */
function updateCoordinatesDisplay() {
  const disp = document.getElementById("clicked-buttons");
  const active = frames[currentFrameIndex];
  const lines = active.coords.map(pt => `(${pt.row}, ${pt.col})`);
  disp.textContent = lines.join(", ");
}

function updateFrameIndicator() {
  const el = document.getElementById("frame-indicator");
  if (!el) return;
  el.textContent = `Active: ${frames[currentFrameIndex].name}`;
}

/* ============================
   ORIENTATION MAPPING
============================ */
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

/* ============================
   SCROLLING LOGIC
============================ */
function startScroll() {
  if (scrollingInProgress) return;
  scrollingInProgress = true;

  stopScroll(); 

  // Build one 'megaframe' from all frames
  const megaCoords = buildMegaFrame();
  if (!megaCoords.length) {
    console.warn("No lit pixels in frames. Nothing to animate.");
    scrollingInProgress = false;
    return;
  }

  // Find bounding box (minCol, maxCol)
  let minC = Infinity, maxC = -Infinity;
  megaCoords.forEach(pt => {
    if (pt.col < minC) minC = pt.col;
    if (pt.col > maxC) maxC = pt.col;
  });

  // Start offset so that left edge is just beyond the right side:
  let offset = GRID_SIZE - minC;

  let delay = parseInt(document.getElementById("delay-input").value, 10);
  if (isNaN(delay) || delay < 0) delay = 150;

  scrollInterval = setInterval(() => {
    renderMegaCoords(megaCoords, offset);

    if (offset + maxC < 0) {
      stopScroll();
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

    // bounding box for this frame
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

    // Move currentX for next frame (no gap => + width)
    currentX += width;
  });

  return result;
}

/**
 * Renders the merged coords at the given offset (shift all columns by offset).
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

/* ============================
   EXPORT LOGIC
============================ */

/**
 * Copies the current coordinates to the clipboard in JSON format.
 */
function copyCoordinates() {
  const data = {
    frames: frames.map(f => ({ name: f.name, coords: f.coords }))
  };
  const json = JSON.stringify(data, null, 2);

  navigator.clipboard.writeText(json)
    .then(() => alert("Copied to clipboard!"))
    .catch(err => console.error("Clipboard copy failed:", err));
}

/**
 * Prompts a file download in JSON format (coordinates.json).
 */
function downloadJSON() {
  const data = {
    frames: frames.map(f => ({ name: f.name, coords: f.coords }))
  };
  const jsonStr = JSON.stringify(data, null, 2);

  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "frames.json";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
  
    const blob = new Blob([rustContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement("a");
    link.href = url;
    link.download = "nm_scroll_frames.rs";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
  
/**
 * Generates the Rust source code for your "NmScroll" struct, using:
 *  - the user-chosen scrollSpeed (columns moved per `next()`),
 *  - a single column gap between frames,
 *  - a bounding-box merge of frames.
 *
 * @param {number} scrollSpeed The columns to move each `next()`.
 * @param {number} width  The WIDTH dimension for the Rust code.
 * @param {number} height The HEIGHT dimension for the Rust code.
 * @returns {string} Rust source code
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
  
createGrid();