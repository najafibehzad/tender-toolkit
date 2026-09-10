# Graphics generation with sharp (300 DPI)

All assets are SVG → PNG via sharp. A4 full width = 2480px at 300 DPI.
In the DOCX, the same image is placed with width **794px** (96 DPI units used by docx-js);
keep the exact aspect ratio from the SVG.

## Asset generator skeleton

```js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const A = path.join(__dirname, 'assets');
fs.mkdirSync(A, { recursive: true });
const RED = '#D60000';   // ← brand color from the input file
const BLACK = '#1F1F1F';
const INK = '#262626';
const W = 2480;

async function save(svg, name) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(A, name));
  console.log('wrote', name);
}
```

## 1) Top band — industry identity strip (road dashes)

2480×100 → placed at 794×32 px. Full-width black strip, white dashed centerline
(road lane markings), red brand block on the RIGHT (RTL start side) with a darker
red edge line for depth:

```js
let dashes = '';
for (let x = 70; x < 2130; x += 160) {
  dashes += `<rect x="${x}" y="${40}" width="95" height="10" rx="3" fill="#FFFFFF" opacity="0.88"/>`;
}
const topband = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="100">
  <rect x="0" y="0" width="${W}" height="100" fill="${BLACK}"/>
  ${dashes}
  <rect x="2225" y="0" width="255" height="100" fill="${RED}"/>
  <rect x="2225" y="0" width="14" height="100" fill="#8F0000"/>
</svg>`;
await save(topband, 'topband.png');
```

For non-road industries swap the dash motif: building = stepped skyline rectangles,
municipal/نماینده = arch shapes, generic = thin double lines. Keep it subtle.

## 2) Header divider — two-tone rule

2480×26 → 794×8 px. Thin dark rule full width; heavier red segment from the right
(~60% width) with a small darker-red notch where it begins:

```js
const divider = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="26">
  <rect x="0" y="14" width="${W}" height="5" fill="${INK}"/>
  <rect x="1500" y="4" width="920" height="16" fill="${RED}"/>
  <rect x="1488" y="4" width="12" height="16" fill="#8F0000"/>
</svg>`;
```

## 3) Bottom waves — brand crest over dark body

2480×235 → 794×75 px. Two overlapping smooth paths (brand red above, black below),
transparent above the crest so page text is never covered:

```js
const waves = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="235">
  <path d="M0,118 C310,44 620,158 930,120 C1240,82 1560,34 1870,84 C2110,122 2320,146 2480,124 L2480,235 L0,235 Z" fill="${RED}"/>
  <path d="M0,178 C390,118 780,198 1160,178 C1540,158 1930,86 2480,158 L2480,235 L0,235 Z" fill="${BLACK}"/>
</svg>`;
```

Design constraint: the crest must stay BELOW the contact strip text. Max total
height ~24 mm of page. If the company file already has waves, re-use its shapes
(values can be extracted from document.xml VML/DrawingML paths) but shrink them —
oversized bottom waves are the most common amateur mistake.

## 4) Contact strip icons (15×15 px in footer)

Simple stroke SVGs in brand color, alpha background:

```js
const pin = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
  <g fill="none" stroke="${RED}" stroke-width="14">
    <path d="M96 30 C130 30 150 58 150 86 C150 122 108 158 96 166 C84 158 42 122 42 86 C42 58 62 30 96 30 Z"/>
    <circle cx="96" cy="84" r="20"/>
  </g>
</svg>`;
```

(phone: rounded receiver shape; registration: shield with checkmark — see below)

```js
const reg = `<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192">
  <g fill="none" stroke="${RED}" stroke-width="14">
    <path d="M96 18 L154 44 V96 C154 132 128 158 96 172 C64 158 38 132 38 96 V44 Z"/>
    <path d="M72 92 L90 112 L124 72" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
```

If the original file ships its own icons (word/media/*.png with alpha), prefer those —
extract and use directly.

## 5) Logo preparation

JPG logo → upscale to ~600px with lanczos3 for crisp print:

```js
await sharp('.../img1.jpg')
  .resize(600, 588, { kernel: 'lanczos3' })
  .png()
  .toColorspace('srgb')
  .toFile(path.join(A, 'logo.png'));
```

Place in the header at ~89×87 px (96 DPI units). White JPG backgrounds are fine
sitting on a white page; do not attempt risky white→transparent conversion loops.

## Dimension cheat sheet (300 DPI SVG → 96 DPI docx placement)

| Asset | SVG size | Placement size |
|---|---|---|
| topband | 2480×100 | 794×32 |
| divider | 2480×26 | 794×8 |
| waves | 2480×235 | 794×75 |
| logo | 600×588 | 89×87 |
| icons | 192×192 | 15×15 |
