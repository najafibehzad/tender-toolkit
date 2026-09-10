# docx-js build rules for RTL Persian letterhead

Rules below each exist because of a concrete failure observed during validation.
Violating them produces broken output that still "builds fine".

## Fonts

```js
const FT = { ascii: 'B Titr', hAnsi: 'B Titr', cs: 'B Titr', eastAsia: 'B Titr' };
const FN = { ascii: 'B Nazanin', hAnsi: 'B Nazanin', cs: 'B Nazanin', eastAsia: 'B Nazanin' };
```

- Set the font in ALL FOUR slots. Word picks `cs` (complex script) for Persian text but
  falls back through the others for Latin/digits.
- Persian text runs MUST have `rightToLeft: true` (and `sizeComplexScript` matching `size`,
  `boldComplexScript` matching `bold`), otherwise Word renders Persian with wrong metrics
  and mixed Latin runs in the same paragraph break.
- `reg query "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Fonts"` to verify the
  family name — registry shows exact names Word will match (e.g. family "B Titr" comes
  from "B Titr Bold (TrueType)" = BTITRBD.TTF).

## Section / margins (A4, twips)

```js
page: {
  size: { width: 11906, height: 16838 },
  margin: { top: 2410, bottom: 1985, left: 1300, right: 1300,
            header: 620, footer: 1250, gutter: 0 },
},
```

- `header: 620` → header block starts ~1.1 cm from top (below the top band).
- `top: 2410` → body text starts ~4.25 cm; clears logo+names+divider.
- `footer: 1250` → footer content sits above the waves.
- `bottom: 1985` → last body line clears the contact strip + waves.
- These five values were tuned against a real Word render; changing one shifts overlaps.

## ⚠️ The `titlePage` bug (most important rule)

docx-js writes the `first` header into `header1.xml` but leaves its relationship
dangling, and Word then shows the **default** header on page 1. Symptom: page 1 gets
the continuation-page header, and (if the default header was the small one) the
company header vanishes from the first page entirely.

**Fix: never use `first`/`titlePage`. Put the full letterhead as the default:**

```js
// WRONG: headers: { default: smallHeader, first: fullHeader }, titlePage: true
headers: { default: fullHeader },
footers: { default: fullFooter },
// properties: { titlePage: false, ... }
```

Consequence: every page of the letter carries the full header/footer — which is the
normal convention for corporate letterheads anyway. Verify with the 2-page hash test
(see qa.md).

## RTL mechanics

- Every Persian paragraph: `bidirectional: true`. Every table: `visuallyRightToLeft: true`.
- ⚠️ In RTL paragraphs Word mirrors `jc` semantics: `AlignmentType.RIGHT` + RTL can land
  on the LEFT. For centered blocks use CENTER (safe); for side alignment test the render.
- Cell order in code is LOGICAL; with `visuallyRightToLeft` the first cell renders
  rightmost. Build rows thinking "first = rightmost".
- `insideVertical` table borders render between cells — but outer left/right cell borders
  also mirror in RTL tables, so NEVER draw outer borders via cell `left`/`right` in an RTL
  table; set outer borders to NONE and use only `insideVertical` for separators.

## Header layout table (balanced name block)

3 columns RTL `[logo | name block | balance]`:

- Without the third (left) filler column the name block renders OFF-CENTER
  (pulled toward the logo side). The filler column width ≈ logo column width
  keeps the name truly centered.
- Name line: two runs — «شرکت » in brand red (smaller) + company name in ink
  (larger, B Titr 42 half-points). Latin name below with `characterSpacing: 46`.
- Logo cell `verticalAlign: CENTER` so it aligns with the 3-line name block.

## Floating full-bleed images from the header

Images placed inline inside the header are constrained to the printable width
and can never be full-bleed. Use floating, page-relative, behindDocument:

```js
new ImageRun({
  data: img('topband.png'), type: 'png',
  transformation: { width: 794, height: 32 },
  floating: {
    horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
    verticalPosition:  { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
    behindDocument: true, allowOverlap: true,
    wrap: { type: TextWrappingType.NONE },
  },
})
```

- Top band: offset 0,0 (page top-left).
- Bottom waves: vertical offset ≈ **9975600** EMU (A4 height 16838tw − 75px image height,
  converted). This pins flush to the page bottom from a header/footer anchor.
- Offsets are EMU (1 px @96dpi = 9525 EMU).

## Body skeleton

- «بسمه تعالی» centered, `spacing: { before: 160, after: 260 }`.
- Fields table, 6 logical columns (label|fill)×3 for شماره/تاریخ/پیوست:
  - label cells: `VerticalAlign.BOTTOM`, bold B Nazanin 24 half-points
  - fill cells: bottom border `BorderStyle.DOTTED, size: 10, color: '7F7F7F'` —
    dotted rule reads as "typable field"; solid boxes read as form/cheap.
  - `HeightRule.ATLEAST ~460` per row.
- Colors in docx-js are hex WITHOUT '#'.

## Word COM PDF export (reliable inline pattern)

```powershell
$w = New-Object -ComObject Word.Application
$w.Visible = $false; $w.DisplayAlerts = 0
$doc = $w.Documents.Open('<abs>.docx', $false, $true)   # ReadOnly open
$doc.SaveAs2('<abs>.pdf', 17)
$doc.Close(0); $w.Quit()
```

- Run inline in a single Bash call with escaped `$` (\$). Complex scripts with
  interpolated variables hang more often; inline strings proved stable.
- If a run hangs > ~2 min: kill the Bash task, `taskkill //F //IM WINWORD.EXE`,
  retry inline. Word COM occasionally deadlocks under Git-Bash piping.
