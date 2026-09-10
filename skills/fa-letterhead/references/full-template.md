# Full template — tested docx-js letterhead generator

Copy this, then substitute the brand identity block. This is the exact structure
that passed pixel QA on Windows + MS Word with B Titr / B Nazanin installed.

```js
// build-letterhead.js — Persian RTL corporate letterhead (A4)
const {
  Document, Packer, Paragraph, TextRun, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle, VerticalAlign, HeightRule,
  AlignmentType, Header, Footer,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom, TextWrappingType,
} = require('docx');
const fs = require('fs');
const path = require('path');

// ==== BRAND IDENTITY (fill from the input file / client brief) ====
const BRAND = {
  faPrefix: 'شرکت ',            // rendered in brand red, smaller
  faName: 'به\u200cراه ایزد البرز', // \u200c = ZWNJ inside names
  enName: 'BEH RAH IZAD ALBORZ',
  slogan: 'یک گام جلوتر در صنعت راه و ساختمان',
  address: 'فردیس، خیابان نیروگاه، شقایق غربی، پلاک ۶۳',
  phone: '۰۲۶۳۶۶۶۹۸۷۲ – ۰۹۱۲۶۹۴۲۹۴۱',
  regNo: 'شماره ثبت: ۷۸۶',
  RED: 'D60000', INK: '262626', GRAY: '6B6B6B', DOT: '7F7F7F',
};

const A = path.join(__dirname, 'assets');
const img = (n) => fs.readFileSync(path.join(A, n));

const FT = { ascii: 'B Titr', hAnsi: 'B Titr', cs: 'B Titr', eastAsia: 'B Titr' };
const FN = { ascii: 'B Nazanin', hAnsi: 'B Nazanin', cs: 'B Nazanin', eastAsia: 'B Nazanin' };
const FE = { ascii: 'Georgia', hAnsi: 'Georgia', cs: 'Georgia' };

const fa = (text, o = {}) => new TextRun({
  text, rightToLeft: true, font: FN,
  size: o.size ?? 22, sizeComplexScript: o.size ?? 22,
  bold: o.bold ?? false, boldComplexScript: o.bold ?? false,
  color: o.color ?? BRAND.INK,
});

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const cellNoBorders = { borders: { ...noBorders } };

// ================= HEADER (default on ALL pages — see build-rules.md) =========
const header = new Header({ children: [
  new Paragraph({ spacing: { after: 0, line: 240 }, children: [new ImageRun({
    data: img('topband.png'), type: 'png',
    transformation: { width: 794, height: 32 },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true, allowOverlap: true,
      wrap: { type: TextWrappingType.NONE },
    },
  })]}),
  new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [2400, 4906, 2000],
    borders: { ...noBorders, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [ new TableRow({ children: [
      // logo cell (renders rightmost)
      new TableCell({ ...cellNoBorders,
        width: { size: 2400, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 },
          children: [new ImageRun({ data: img('logo.png'), type: 'png',
            transformation: { width: 89, height: 87 } })] })] }),
      // name block cell
      new TableCell({ ...cellNoBorders,
        width: { size: 4906, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true,
            spacing: { after: 60 },
            children: [
              new TextRun({ text: BRAND.faPrefix, rightToLeft: true, font: FT,
                size: 30, sizeComplexScript: 30, color: BRAND.RED }),
              new TextRun({ text: BRAND.faName, rightToLeft: true, font: FT,
                size: 42, sizeComplexScript: 42, color: BRAND.INK }),
            ] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 70 },
            children: [new TextRun({ text: BRAND.enName, font: FE,
              size: 17, sizeComplexScript: 17, color: BRAND.GRAY,
              characterSpacing: 46 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true,
            spacing: { after: 0 },
            children: [fa(BRAND.slogan, { size: 22, bold: true, color: BRAND.RED })] }),
        ] }),
      // balance cell (keeps name truly centered — do not remove)
      new TableCell({ ...cellNoBorders,
        width: { size: 2000, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
        margins: { top: 40, bottom: 40, left: 60, right: 60 },
        children: [new Paragraph({ spacing: { after: 0 }, children: [] })] }),
    ] })],
  }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    spacing: { before: 100, after: 0, line: 240 },
    children: [new ImageRun({ data: img('divider.png'), type: 'png',
      transformation: { width: 794, height: 8 } })] }),
] });

// ================= FOOTER (default on ALL pages) ==============================
const contactCell = (children, width, align) => new TableCell({
  width: { size: width, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER,
  margins: { top: 30, bottom: 30, left: 60, right: 60 },
  children: [new Paragraph({ alignment: align, bidirectional: true,
    spacing: { after: 0 }, children })] });

const footer = new Footer({ children: [
  new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [4400, 2700, 2206],
    borders: { ...noBorders, insideHorizontal: noBorder,
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: BRAND.RED } },
    rows: [ new TableRow({ height: { value: 480, rule: HeightRule.ATLEAST },
      children: [
        contactCell([img_icon('icon_pin.png'), fa('  ' + BRAND.address, { size: 19 })],
          4400, AlignmentType.RIGHT),
        contactCell([img_icon('icon_phone.png'), fa('  ' + BRAND.phone, { size: 19 })],
          2700, AlignmentType.CENTER),
        contactCell([img_icon('icon_reg.png'), fa('  ' + BRAND.regNo, { size: 19 })],
          2206, AlignmentType.CENTER),
      ] })],
  }),
  new Paragraph({ spacing: { after: 0, line: 240 }, children: [new ImageRun({
    data: img('waves.png'), type: 'png',
    transformation: { width: 794, height: 75 },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 9975600 },
      behindDocument: true, allowOverlap: true,
      wrap: { type: TextWrappingType.NONE },
    },
  })] }),
] });

// helper: inline footer icon
function img_icon(name) {
  return new ImageRun({ data: img(name), type: 'png',
    transformation: { width: 15, height: 15 } });
}

// ================= BODY ======================================================
const fieldLabel = (t, w) => new TableCell({ ...cellNoBorders,
  width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM,
  margins: { top: 20, bottom: 40, left: 20, right: 20 },
  children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 0 }, children: [fa(t, { size: 24, bold: true })] })] });

const fieldFill = (w) => new TableCell({
  borders: { ...noBorders,
    bottom: { style: BorderStyle.DOTTED, size: 10, color: BRAND.DOT } },
  width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.BOTTOM,
  margins: { top: 20, bottom: 40, left: 20, right: 20 },
  children: [new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 0 }, children: [fa(' ', { size: 24 })] })] });

const bodyChildren = [
  new Paragraph({ alignment: AlignmentType.CENTER, bidirectional: true,
    spacing: { before: 160, after: 260 },
    children: [fa('بسمه تعالی', { size: 24, bold: true })] }),
  new Table({
    visuallyRightToLeft: true,
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [1050, 2052, 1050, 2052, 1050, 2052],
    borders: { ...noBorders, insideHorizontal: noBorder, insideVertical: noBorder },
    rows: [ new TableRow({ height: { value: 460, rule: HeightRule.ATLEAST },
      children: [
        fieldLabel('شماره:', 1050), fieldFill(2052),
        fieldLabel('تاریخ:', 1050), fieldFill(2052),
        fieldLabel('پیوست:', 1050), fieldFill(2052),
      ] })],
  }),
  new Paragraph({ bidirectional: true, spacing: { before: 200, after: 0 },
    children: [fa('', { size: 24 })] }),
];

// 2-page QA filler (TEST_PAGES=2 node build-letterhead.js)
if (process.env.TEST_PAGES === '2') {
  for (let i = 0; i < 34; i++) bodyChildren.push(new Paragraph({
    bidirectional: true, spacing: { after: 120 },
    children: [fa('متن آزمایشی نامه برای بررسی صفحه دوم — ' + (i + 1), { size: 24 })] }));
}

// ================= DOCUMENT ==================================================
const doc = new Document({
  creator: BRAND.enName,
  title: 'سربرگ رسمی ' + BRAND.faName,
  styles: { default: { document: {
    run: { font: FN, size: 24, sizeComplexScript: 24 } } } },
  sections: [{
    properties: {
      titlePage: false,   // ⚠️ must be false — see build-rules.md titlePage bug
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 2410, bottom: 1985, left: 1300, right: 1300,
                  header: 620, footer: 1250, gutter: 0 },
      },
    },
    headers: { default: header },
    footers: { default: footer },
    children: bodyChildren,
  }],
});

const OUT = process.env.TEST_PAGES === '2'
  ? path.join(__dirname, 'letterhead-test2.docx')
  : path.join(__dirname, 'letterhead.docx');
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log('WROTE', OUT, buf.length, 'bytes');
});
```

Notes:
- `icon_pin.png / icon_phone.png / icon_reg.png` come from graphics.md (or extracted
  from the original file's word/media). Define `img_icon` BEFORE `footer` if you
  hoist functions; here it is shown inline for readability — in real code declare it above.
- ZWNJ (`\u200c`) inside Persian names: «به‌راه» not «بهراه».
- The empty final paragraph in body gives breathing room before the letter text.
- Deliver: docx + PDF (Word COM `SaveAs2 ..., 17`) next to the original input.
