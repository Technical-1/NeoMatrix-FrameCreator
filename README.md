# NeoMatrix Frame Creator

## About The Project

The **NeoMatrix Frame Creator** is a web-based tool designed to help developers and artists craft LED matrix frames for **animations** on projects that use NeoMatrix and WS2812 (RGB) LEDs. The tool provides an interactive grid and straightforward controls to visualize each frame, experiment with orientation and sizes, and ultimately export your designs into usable code. This was originally designed for the final project in the University of Florida class CEN4907C, Computer Engineering Design 1, on the WS2812 LED matrix.

[**Try it out here**](https://technical-1.github.io/NeoMatrix-FrameCreator/)

---

## Features

- **Dynamic Grid Size**  
  Easily change the grid dimensions to match your LED matrix.

- **Multiple Frames**  
  Create multiple frames and seamlessly switch between them. Perfect for complex animations that require more than a single frame.

- **Orientation Adjustment**  
  Instantly flip or rotate the origin corner (top-left, top-right, bottom-left, bottom-right) to match your physical matrix wiring.

- **Interactive Click/Tap**  
  Each grid cell can be toggled on or off with a simple click. The tool records your selections and displays the coordinates in real-time.

- **Clear and Reset**  
  One-click clear function to reset any single frame without losing others.

- **Export Coordinates**  
  - **JSON/CSV**: Download your current frames as structured data for easy parsing in other applications.  
  - **Rust Code**: Generate a `.rs` file containing statically defined arrays for each frame and a scrolling implementation (optional), ready to integrate with your NeoMatrix Rust project.

- **Scrolling Preview**  
  Simulate a scrolling animation to see how your frames will look on an actual LED matrix. Adjust the delay (speed) and observe the result in real-time.

---

## How to Use

1. **Open the Tool**  
   Go to [**NeoMatrix Frame Creator**](https://technical-1.github.io/NeoMatrix-FrameCreator/) in your browser.

2. **Set Up Your Grid**  
   - Choose an initial **Grid Size** (e.g., 8 for an 8×8 matrix).  
   - Pick your **Orientation** (top-left, top-right, etc.).

3. **Create Frames**  
   - Click **New Frame** to start a fresh frame.  
   - Toggle cells on/off to design your LED pattern for that frame.  
   - Switch to **Next Frame** or **Previous Frame** to edit others in the sequence.

4. **Scrolling Preview**  
   - Use the **Animation Delay** input to set how quickly the frames scroll.  
   - Click **Play** to watch your frames scroll across the grid.  
   - Click **Stop** to end the preview.

5. **Export Your Work**  
   - **Copy JSON**: Copies all frames (coordinates and names) to your clipboard in JSON format.  
   - **Download JSON** / **Download CSV**: Saves your frames to a file for easy integration in other applications.  
   - **Download Rust Code**: Automatically generates a Rust source file (`.rs`) with each frame’s coordinates plus a basic scrolling function (optional). Ideal for embedding into NeoMatrix + WS2812 projects.

---

## Example Usage (Rust)

Below is a Rust snippet showing how you might integrate frames (from a downloaded `.rs` file or JSON) into a NeoMatrix animation:

```rust
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

    fn draw_letter(&mut self, letter: &[(usize, usize)], offset_x: isize) {
        for &(x, y) in letter.iter() {
            let x_pos = x as isize + offset_x;
            if x_pos >= 0 && x_pos < WIDTH as isize {
                self.set(x_pos as usize, y);
            }
        }
    }

    pub fn next(&mut self) {
        self.clear();

        // Example frame data
        let frame_1 = [
            (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6),
            (1, 6), (2, 6), (4, 0), (5, 0), (6, 0), (7, 1),
        ];

        let offset = self.frame / 2;
        self.draw_letter(&frame_1, offset - 7);

        // Additional frames / logic

        let spacing = 2;
        let frame_width = 4;
        let total_length = frame_width + spacing;
        let scroll_length = WIDTH as isize + total_length as isize;

        self.frame = (self.frame + 1) % (scroll_length * 2);
    }
}
