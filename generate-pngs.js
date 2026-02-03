#!/usr/bin/env node
/**
 * PNG Asset Generator for NeoMatrix Frame Creator
 * Generates og-image.png, apple-touch-icon.png, favicon-32x32.png, favicon-16x16.png
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const colors = {
    bg: '#0a0a0f',
    bgLight: '#14141f',
    cell: '#1a1a24',
    cyan: '#00f0ff',
    magenta: '#ff00aa',
    green: '#00ff6a',
    text: '#e8e8f0',
    textMuted: '#a0a0b0',
    border: '#2a2a3e'
};

function drawRoundedRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}

function drawLED(ctx, x, y, size, color, glow = true) {
    const r = size * 0.15;
    if (glow && color !== colors.cell) {
        // Outer glow
        ctx.fillStyle = color + '40';
        drawRoundedRect(ctx, x - 3, y - 3, size + 6, size + 6, r + 2);
        // Inner glow
        ctx.fillStyle = color + '80';
        drawRoundedRect(ctx, x - 1, y - 1, size + 2, size + 2, r + 1);
    }
    ctx.fillStyle = color;
    drawRoundedRect(ctx, x, y, size, size, r);
    // Highlight
    if (color !== colors.cell) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        drawRoundedRect(ctx, x + size * 0.1, y + size * 0.1, size * 0.4, size * 0.2, r * 0.5);
    }
}

// Draw rectangular LED with glow
function drawLEDRect(ctx, x, y, w, h, color, glow = true) {
    const r = Math.min(w, h) * 0.15;
    if (glow && color !== colors.cell) {
        // Outer glow
        ctx.fillStyle = color + '40';
        drawRoundedRect(ctx, x - 3, y - 3, w + 6, h + 6, r + 2);
        // Inner glow
        ctx.fillStyle = color + '80';
        drawRoundedRect(ctx, x - 1, y - 1, w + 2, h + 2, r + 1);
    }
    ctx.fillStyle = color;
    drawRoundedRect(ctx, x, y, w, h, r);
    // Highlight
    if (color !== colors.cell) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        drawRoundedRect(ctx, x + w * 0.1, y + h * 0.08, w * 0.4, h * 0.12, r * 0.5);
    }
}

function generateOGImage() {
    const canvas = createCanvas(1200, 630);
    const ctx = canvas.getContext('2d');
    const w = 1200, h = 630;

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = colors.cyan + '15';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < w; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, h);
        ctx.stroke();
    }
    for (let i = 0; i < h; i += 60) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(w, i);
        ctx.stroke();
    }

    // LED Matrix container - sized to fit 7x4 grid properly
    const containerX = 60;
    const containerY = 140;
    const containerW = 460;
    const containerH = 350;

    ctx.fillStyle = colors.bgLight;
    drawRoundedRect(ctx, containerX, containerY, containerW, containerH, 16);
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 2;
    ctx.stroke();

    // LED pattern spelling "NM" (stylized)
    // 7 columns x 4 rows, filling the container with padding
    const padding = 20;
    const cellW = 52;
    const cellH = 68;
    const gapX = 8;  // (460 - 40 - 7*52) / 6 = ~8
    const gapY = 9;  // (350 - 40 - 4*68) / 3 = ~9

    const pattern = [
        [1, 0, 0, 1, 0, 2, 2],
        [1, 1, 0, 1, 0, 2, 0],
        [1, 0, 1, 1, 0, 2, 2],
        [1, 0, 0, 1, 0, 2, 0],
    ];

    for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 7; col++) {
            const x = containerX + padding + col * (cellW + gapX);
            const y = containerY + padding + row * (cellH + gapY);
            const val = pattern[row][col];
            const color = val === 0 ? colors.cell : val === 1 ? colors.cyan : colors.magenta;
            drawLEDRect(ctx, x, y, cellW, cellH, color);
        }
    }

    // Title
    ctx.fillStyle = colors.cyan;
    ctx.font = 'bold 72px sans-serif';
    ctx.shadowColor = colors.cyan;
    ctx.shadowBlur = 20;
    ctx.fillText('NeoMatrix', 580, 230);
    ctx.shadowBlur = 0;

    ctx.fillStyle = colors.text;
    ctx.font = '500 48px sans-serif';
    ctx.fillText('Frame Creator', 580, 300);

    ctx.fillStyle = colors.textMuted;
    ctx.font = '24px sans-serif';
    ctx.fillText('Design LED matrix animations for WS2812 NeoPixel', 580, 380);
    ctx.fillText('displays. Export to Rust code or animated GIF.', 580, 420);

    // Feature pills
    const pills = [
        { text: 'Multi-Color', color: colors.cyan },
        { text: 'GIF Export', color: colors.magenta },
        { text: 'Rust Code', color: colors.green }
    ];

    pills.forEach((pill, i) => {
        const px = 580 + i * 160;
        const py = 480;
        ctx.fillStyle = '#1a1a2e';
        drawRoundedRect(ctx, px, py, 140, 40, 20);
        ctx.strokeStyle = pill.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = pill.color;
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(pill.text, px + 70, py + 26);
    });
    ctx.textAlign = 'left';

    // Logo in corner
    ctx.fillStyle = colors.bgLight;
    drawRoundedRect(ctx, 1080, 520, 80, 80, 12);

    const miniLeds = [
        [0, 1, 0],
        [2, 1, 2],
        [0, 1, 0]
    ];
    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = 1092 + col * 20;
            const y = 532 + row * 20;
            const val = miniLeds[row][col];
            const color = val === 0 ? colors.cell : val === 1 ? colors.cyan : colors.magenta;
            drawLED(ctx, x, y, 16, color, false);
        }
    }

    return canvas;
}

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const cellSize = size / 4;
    const gap = cellSize * 0.15;
    const ledSize = cellSize - gap;
    const r = size * 0.18;
    const padding = cellSize * 0.5;

    // Background
    ctx.fillStyle = colors.bgLight;
    drawRoundedRect(ctx, 0, 0, size, size, r);

    // Border
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = size * 0.03;
    ctx.stroke();

    const pattern = [
        [0, 1, 0],
        [2, 1, 2],
        [0, 1, 0]
    ];

    for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
            const x = padding + col * cellSize;
            const y = padding + row * cellSize;
            const val = pattern[row][col];
            const color = val === 0 ? colors.cell : val === 1 ? colors.cyan : colors.magenta;
            drawLED(ctx, x, y, ledSize, color, size > 32);
        }
    }

    return canvas;
}

// Generate all PNGs
console.log('Generating PNG assets...\n');

const outputDir = __dirname;

// OG Image (1200x630)
const ogCanvas = generateOGImage();
fs.writeFileSync(path.join(outputDir, 'og-image.png'), ogCanvas.toBuffer('image/png'));
console.log('✓ og-image.png (1200x630)');

// Apple Touch Icon (180x180)
const appleCanvas = generateIcon(180);
fs.writeFileSync(path.join(outputDir, 'apple-touch-icon.png'), appleCanvas.toBuffer('image/png'));
console.log('✓ apple-touch-icon.png (180x180)');

// Favicon 32x32
const fav32Canvas = generateIcon(32);
fs.writeFileSync(path.join(outputDir, 'favicon-32x32.png'), fav32Canvas.toBuffer('image/png'));
console.log('✓ favicon-32x32.png (32x32)');

// Favicon 16x16
const fav16Canvas = generateIcon(16);
fs.writeFileSync(path.join(outputDir, 'favicon-16x16.png'), fav16Canvas.toBuffer('image/png'));
console.log('✓ favicon-16x16.png (16x16)');

console.log('\nAll PNG assets generated successfully!');
