# NeoMatrix Frame Creator

## About The Project

The NeoMatrix Frame Creator is a web-based tool designed to assist creators in developing artwork frames for use in animations, specifically tailored for projects involving NeoMatrix and WS2812 LED matrices. This interactive tool simplifies the process of visualizing and planning the layout of LED animations, making it an invaluable resource for artists and developers working with LED matrix projects.

Accessible via [this link](https://technical-1.github.io/NeoMatrix-FrameCreator/), this tool provides a user-friendly interface for creating and experimenting with different frame designs that can be directly implemented in LED animations.

## Features

- **Interactive 8x8 Matrix Grid**: A clickable grid that visually represents the matrix, allowing for intuitive design and planning.
- **Dynamic Orientation Adjustment**: Easily adjust the "row 0" orientation to create frames in every orientation.
- **Toggle Functionality**: Buttons can be toggled on or off, with their coordinates dynamically added or removed from the array.
- **Clear and Reset**: A simple way to clear all selections and start fresh with a single click.

## How to Use

1. **Access the Tool**: Navigate to [NeoMatrix Frame Creator](https://technical-1.github.io/NeoMatrix-FrameCreator/) to begin creating your frame.
2. **Create Your Design**: Adjust the orientation as needed to match your project's specifications. Click on the grid to enable or disable single LEDs from your frame.
3. **View Coordinates**: Use the displayed coordinates to copy and paste into your code and implement frame integration.
4. **Reset as Needed**: Click the "Clear" button to remove all current selections and start a new design.

## Example Usage

The following Rust code example demonstrates how you might utilize the coordinates and design principles from the NeoMatrix Frame Creator in an animation project for NeoMatrix WS2812 LEDs.

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

        let letter_j = [
            (3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (1, 6), (2, 6), (3, 6), (4, 6), (5, 6), (4, 0), (5, 0), (6, 0), (7, 1),
        ];
        // Additional letter definitions

        let offset = self.frame / 2 as isize;

        self.draw_letter(&letter_j, offset - 7);
        // Additional draw_letter calls

        let spacing = 2;
        let letter_size = 4;
        let num_letters = 1;
        let total_length = num_letters * letter_size + 1 * spacing;
        let scroll_length = WIDTH as isize + total_length as isize;

        self.frame = (self.frame + 1) % (scroll_length * 2);
    }
}
'''
