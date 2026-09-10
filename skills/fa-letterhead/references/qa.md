# QA — pixel verification of rendered pages

Python is usually NOT available on these Windows boxes; poppler/pdftoppm neither.
The reliable chain is: **Word COM → PDF → WinRT PdfDocument → PNG → sharp analysis**.
`scripts/docx2png.ps1` does the whole chain (parametrized, no interpolation issues).

Judge subagents may have NO image input (model without vision) — "look at it and
tell me" does not work. Programmatic pixel analysis is the acceptance gate.

## Run

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File "<skill>/scripts/docx2png.ps1" \
  -Docx "C:\abs\letterhead.docx" -OutDir "C:\abs\qa" -Dpi 130
```

Output: `page1.png, page2.png, ...` at ~1612×2280 px (130 DPI A4).

## 2-page consistency (hash test)

Build a test copy with filler paragraphs (env var in the generator, e.g.
`TEST_PAGES=2` → append ~34 dummy Persian paragraphs) and render it. The
letterhead zones must be BIT-IDENTICAL between pages:

```js
const sharp = require('sharp');
(async () => {
  for (const f of ['page1.png','page2.png']) {
    const top = await sharp(f).extract({left:0, top:0, width:1612, height:620}).raw().toBuffer();
    const bot = await sharp(f).extract({left:0, top:1990, width:1612, height:290}).raw().toBuffer();
    const c = require('crypto');
    console.log(f, c.createHash('sha256').update(top).digest('hex').slice(0,12),
                    c.createHash('sha256').update(bot).digest('hex').slice(0,12));
  }
})();
```

Identical hashes for both zones on every page = header/footer repeat correctly.
Full-page hashes differ (body text differs) — that is expected.

## Structural probes (first page)

Raw pixel scan with sharp (`raw().toBuffer({resolveWithObject:true})`), thresholds
validated at 130 DPI / 1612×2280:

| Check | How | Pass |
|---|---|---|
| Top band full-bleed | dark/brand coverage across row y≈1.2%·H, step 4px | ≈ 1.0 |
| Brand red at top-right | red px count x>90%W vs x<10%W at band row | right>0, left=0 (RTL start) |
| Name block centered | dark ink count left half vs right half of y 5–16% | within ~2% |
| Divider red segment | contiguous rows with red coverage>~40px width | found |
| Fields dotted lines | gray dotted px in y 30–40% | >0 (empty final = missing fields) |
| Contact strip readable | dark text px over y 84.5–95.5% | >0 |
| Waves | red+black coverage at y≈98.5% | both >0 |
| Tofu check | longest contiguous dark run in a fixed center column of name zone | small (<10px); Persian glyphs cluster, missing-glyph boxes give long solid runs |

## ASCII structural maps (quick human-checkable view)

Downsample a zone to ~100 cols × N rows, mark `#`(ink) `R`(brand red) `r`(light red)
`.`(empty). Correct first-page map: full `#`/`R` band rows 1–3, balanced name cluster
in the middle rows, red divider line, then sparse body ink, then bottom strip text over
the `R`/`#` wave rows. A name block hugging one edge or an all-empty second-page header
is instantly visible. (See qa-ascii.js pattern in the session this skill was captured
from — extract → classify per cell → join.)

## Common failure signatures

- **Header only on page 1 / wrong header on page 1** → the titlePage bug; see
  build-rules.md § titlePage.
- **Name block off-center** → missing left balance cell in the 3-column header table.
- **Footer text under the waves (unreadable)** → footer margin too small or wave too
  tall; raise `footer` twips or shrink wave SVG.
- **Fields invisible** → dotted border color too light (use 7F7F7F, size 10) or zone
  y-range misjudged — always confirm with the ASCII map before "fixing" the doc.
- **Second page missing footer** → footer defined only as `first`; must be `default`.
- **Persian shows boxes/latin reversed** → missing `rightToLeft: true` on runs or font
  not in all four slots.
