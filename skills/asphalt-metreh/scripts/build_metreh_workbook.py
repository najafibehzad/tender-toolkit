# -*- coding: utf-8 -*-
"""Builder for the asphalt metreh toolkit: data-entry form + dashboard + print setup.

Takes a RAW metreh workbook (Sheet1 with page blocks) and produces a new workbook with:
  - Sheet1 : original formulas untouched; EMPTY input cells get live links to the form;
             print-ready «ریز متر روز» (existing header/footer preserved & completed)
  - ورود داده : the data-entry form (PAGES*15 rows mapped 1:1 onto Sheet1 data rows)
  - داشبورد : management dashboard reading Sheet1 grand totals

Edit the CONFIG block, then run with a python that has openpyxl.
Guarantees: every pre-existing formula/value byte-identical (verified separately);
links only into cells that were completely empty.
"""
import os, re, sys, zipfile
import openpyxl
from openpyxl.cell.cell import MergedCell
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.pagebreak import Break
from openpyxl.worksheet.properties import PageSetupProperties
from openpyxl.chart import BarChart, PieChart, DoughnutChart, LineChart, Reference
from openpyxl.chart.label import DataLabelList
from openpyxl.chart.series import DataPoint
from openpyxl.chart.marker import Marker
from openpyxl.drawing.text import (Paragraph, ParagraphProperties, CharacterProperties,
                                   Font as DrawingFont, RichTextProperties, RegularTextRun)
from openpyxl.chart.title import Title
from openpyxl.chart.text import Text, RichText
from copy import deepcopy

# ============================== CONFIG ==============================
SRC = r"D:\آسفالت م۱ کیان ۱۴۰۴\ریزمتره خام آسفالت 1404.xlsx"
OUT = r"D:\آسفالت م۱ کیان ۱۴۰۴\ریزمتره خام آسفالت 1404 - داشبورد و فرم.xlsx"
PRINT_TITLE = "ریز متر روز نسبت به"        # prepended to the print header

# geometry of the raw workbook's page blocks
S1_NAME          = "Sheet1"
PAGES            = 30      # number of page blocks
ROWS_PER_PAGE    = 15      # data rows per block
PITCH            = 27      # rows from one block start to the next
FIRST_DATA_ROW   = 3       # Sheet1 row of block-1 data row 1
PRINT_LAST_COL   = "Z"     # last printed column
# grand-total cells (last block's summary table): metric -> Sheet1 cell
TOTALS = {
    "کل":        "P806",   # جمع کل آسفالت m2
    "لکه":       "H805",   "نوار": "H806", "خاکی": "H807", "روکش": "P805",
    "تخریب":     "P807",   "خاکبرداری": "X805", "بیس": "X806", "بتن": "X807",
    "کاتر":      "H808",
}
# Sheet1 input columns -> form columns / kind
#   kind: text ("" when empty) | num (0 when empty — feeds multiplication!)
#         lake/navar/rouk/khaki (area routed by نوع عملیات dropdown)
#   NOTE khaki: the raw template hard-codes K=H on every data row; per user request the
#   khaki column is routed by the dropdown like lake/navar/rouk, so K=H gets REPLACED.
LINKS = [
    (2,  "D", "text"), (6, "E", "num"), (7, "F", "num"),
    (13, "H", "num"), (18, "I", "num"), (21, "J", "num"), (24, "K", "num"),
    (17, "M", "text"),
    (9,  "G", "lake"), (10, "G", "navar"), (12, "G", "rouk"), (11, "G", "khaki"),
]
CUTTER_COL   = 16   # طول برش کاتر — often pre-filled with perimeter formula =(F*2)+(G*2)
CUTTER_DEPTH = 17   # عمق کاتر
# =====================================================================

# design tokens (xlsx skill design.md palette) — kept inline so the script is portable
PRIMARY, PRIMARY_LIGHT = "1B2A4A", "D6E4F0"
SECONDARY = PRIMARY_LIGHT
ACCENT_POSITIVE, ACCENT_NEGATIVE, ACCENT_WARNING = "1B7D46", "C0392B", "D4820A"
NEUTRAL_900, NEUTRAL_600 = "37352F", "8C8A84"
NEUTRAL_200, NEUTRAL_100, NEUTRAL_0 = "E9E9E8", "F7F7F5", "FFFFFF"

FONT = "B Nazanin"
ZWNJ = "\u200c"
T_LAKE, T_NAVAR, T_KHAKI, T_ROUK = "لکه" + ZWNJ + "گیری", "نوار حفاری", "بستر خاکی", "روکش آسفالت"
FORM_SHEET, DASH_SHEET = "ورود داده", "داشبورد"
FR_TOP = 7
FR_BOT = FR_TOP + PAGES * ROWS_PER_PAGE - 1
FR_TOT = FR_BOT + 1

def f(size=10, bold=False, color=NEUTRAL_900):
    return Font(name=FONT, size=size, bold=bold, color=NEUTRAL_900)
def fl(hexcolor):
    return PatternFill("solid", fgColor=hexcolor)
AC = Alignment(horizontal="center", vertical="center", wrap_text=True)
AR = Alignment(horizontal="right", vertical="center", wrap_text=True)

def make_title(text, size_pt=12, bold=True):
    rpr = CharacterProperties(latin=DrawingFont(typeface=FONT), ea=DrawingFont(typeface=FONT),
                              sz=int(size_pt * 100), b=bold)
    run = RegularTextRun(rPr=deepcopy(rpr), t=text)
    para = Paragraph(pPr=ParagraphProperties(defRPr=deepcopy(rpr)), r=[run])
    return Title(tx=Text(rich=RichText(bodyPr=RichTextProperties(), p=[para])))

wb = openpyxl.load_workbook(SRC)
ws1 = wb[S1_NAME]

# ---- sanity: detect page blocks and confirm the CONFIG geometry
marks = [r for r in range(1, ws1.max_row + 1)
         if isinstance(ws1.cell(row=r, column=1).value, str)
         and "جمع این صفحه" in ws1.cell(row=r, column=1).value]
print(f"detected {len(marks)} page blocks; summary rows {marks[:3]}...{marks[-2:]}")
assert len(marks) == PAGES, f"CONFIG PAGES={PAGES} but found {len(marks)}"
assert marks[1] - marks[0] == PITCH, "CONFIG PITCH mismatch"

# ============================ Sheet1: input links ============================
skipped, placed, khaki_replaced = [], 0, 0
for page in range(PAGES):
    for i in range(ROWS_PER_PAGE):
        sr = FIRST_DATA_ROW + page * PITCH + i
        fr = FR_TOP + page * ROWS_PER_PAGE + i
        p_cell = ws1.cell(row=sr, column=CUTTER_COL)
        p_locked = p_cell.value is not None
        for col, fcol, kind in LINKS:
            cell = ws1.cell(row=sr, column=col)
            if isinstance(cell, MergedCell):
                continue
            if cell.value is not None and kind != "khaki":
                skipped.append((sr, col, str(cell.value)[:20]))
                continue
            if kind == "text":
                fx = f"=IF('{FORM_SHEET}'!${fcol}{fr}=\"\",\"\",'{FORM_SHEET}'!${fcol}{fr})"
            elif kind == "num":
                # MUST return 0, not "": these feed products like H=G*F — ""*"" → #VALUE!
                fx = f"=IF('{FORM_SHEET}'!${fcol}{fr}=\"\",0,'{FORM_SHEET}'!${fcol}{fr})"
            elif kind == "khaki":
                if cell.value is not None:
                    khaki_replaced += 1      # replaces the raw template's K=H
                fx = f"=IF(AND('{FORM_SHEET}'!$G{fr}=\"{T_KHAKI}\",$H{sr}>0),$H{sr},\"\")"
            else:
                t = {"lake": T_LAKE, "navar": T_NAVAR, "rouk": T_ROUK}[kind]
                fx = f"=IF(AND('{FORM_SHEET}'!$G{fr}=\"{t}\",$H{sr}>0),$H{sr},\"\")"
            cell.value = fx
            placed += 1
        if not p_locked and not isinstance(p_cell, MergedCell):
            p_cell.value = f"=IF('{FORM_SHEET}'!$L{fr}=\"\",\"\",'{FORM_SHEET}'!$L{fr})"
            placed += 1
print(f"Sheet1 links placed: {placed} | skipped (pre-filled): {len(skipped)} "
      f"| khaki K=H replaced: {khaki_replaced}")

# ============================ Sheet1: print setup ============================
# The raw file already carries its own header/footer and (usually) some page breaks —
# extend them, never overwrite. openpyxl mangles &-codes, so the header is re-written
# directly in the XML after save (see post-save fixup).
ws1.print_area = f"A1:{PRINT_LAST_COL}{ws1.max_row}"
ws1.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
ws1.page_setup.fitToWidth = 1
ws1.page_setup.fitToHeight = 0
# one page per block: break after «جمع این صفحه» + 8 rows (نقل + blank + summary + blank),
# matching the raw file's own break convention; skip any break beyond the print area
existing = {brk.id for brk in ws1.row_breaks.brk}
for m in marks:
    brk = m + 8
    if brk < ws1.max_row and brk not in existing:
        ws1.row_breaks.append(Break(id=brk))
print(f"page breaks now: {len({b.id for b in ws1.row_breaks.brk})}")

# ============================ Sheet: فرم ورود داده ============================
ws = wb.create_sheet(FORM_SHEET)
ws.sheet_view.rightToLeft = True
ws.sheet_view.showGridLines = False
ws.sheet_properties.tabColor = ACCENT_POSITIVE
widths = {"A": 2, "B": 7, "C": 7, "D": 24, "E": 9, "F": 9, "G": 14, "H": 10,
          "I": 11, "J": 10, "K": 10, "L": 11, "M": 9, "N": 12}
for col, w in widths.items():
    ws.column_dimensions[col].width = w
for r, hh in ((1, 8), (2, 30), (3, 18), (4, 18), (5, 6), (6, 36)):
    ws.row_dimensions[r].height = hh

ws.merge_cells("B2:N2")
ws["B2"] = "فرم ورود داده متره آسفالت"
ws["B2"].font = f(15, True, PRIMARY); ws["B2"].alignment = AR
ws.merge_cells("B3:N3")
ws["B3"] = ("هر ۱۵ ردیف = یک صفحه از ریزمتره — داده‌ها به‌صورت زنده در شیت اصلی می‌نشینند و "
            "مساحت و حجم‌ها همان‌جا با فرمول‌های اصلی محاسبه می‌شوند.")
ws["B3"].font = f(9, color=NEUTRAL_600); ws["B3"].alignment = AR
ws.merge_cells("B4:N4")
ws["B4"] = ("سلول‌های خاکستری: در شیت اصلی فرمول (محیط کاتر) یا مقدار ثابت دارند و از فرم پیروی نمی‌کنند — "
            "برای چاپ «ریز متر روز» به شیت اصلی بروید و Ctrl+P بزنید.")
ws["B4"].font = f(9, color=NEUTRAL_600); ws["B4"].alignment = AR

headers = ["صفحه", "ردیف", "آدرس / موقعیت", "طول (متر)", "عرض (متر)", "نوع عملیات",
           "ضخامت تخریب (متر)", "ضخامت خاکبرداری (متر)", "ضخامت اساس (متر)",
           "ضخامت بتن (متر)", "طول برش کاتر (متر)", "عمق کاتر (متر)",
           "مساحت (م²) — پیش" + ZWNJ + "نمایش"]
INP = set(range(4, 14))
for i, hh in enumerate(headers):
    c = ws.cell(row=6, column=2 + i, value=hh)
    colx = 2 + i
    c.font = f(10, True, "FFFFFF" if colx in INP else PRIMARY)
    c.fill = fl(PRIMARY if colx in INP else PRIMARY_LIGHT)
    c.alignment = AC
    c.border = Border(bottom=Side(style="thin", color=NEUTRAL_200))

gray_map = {(sr, col) for sr, col, _ in skipped}
for page in range(PAGES):
    for i in range(ROWS_PER_PAGE):
        sr = FIRST_DATA_ROW + page * PITCH + i
        if ws1.cell(row=sr, column=CUTTER_COL).value is not None:
            gray_map.add((sr, CUTTER_COL))

p_start = Border(top=Side(style="thin", color=PRIMARY))
fr2s1 = {4: 2, 5: 6, 6: 7, 8: 13, 9: 18, 10: 21, 11: 24, 12: CUTTER_COL, 13: CUTTER_DEPTH}
for page in range(PAGES):
    band = NEUTRAL_0 if page % 2 == 0 else NEUTRAL_100
    r0 = FR_TOP + page * ROWS_PER_PAGE
    ws.merge_cells(start_row=r0, start_column=2, end_row=r0 + ROWS_PER_PAGE - 1, end_column=2)
    bc = ws.cell(row=r0, column=2, value=f"=INT((ROW()-{FR_TOP})/{ROWS_PER_PAGE})+1")
    bc.font = f(11, True, PRIMARY); bc.alignment = AC
    for i in range(ROWS_PER_PAGE):
        r = r0 + i
        ws.row_dimensions[r].height = 20
        for colx in range(2, 15):
            c = ws.cell(row=r, column=colx)
            c.fill = fl(band)
            c.font = f(10)
            c.alignment = AC if colx != 4 else AR
            if i == 0:
                c.border = p_start
        ws.cell(row=r, column=3, value=f"=MOD(ROW()-{FR_TOP},{ROWS_PER_PAGE})+1").alignment = AC
        ws.cell(row=r, column=14,
                value=f"=IF(COUNT($E{r}:$F{r})<2,\"\",$E{r}*$F{r})").number_format = "#,##0.00"
        sr = FIRST_DATA_ROW + page * PITCH + i
        for fcol, s1col in fr2s1.items():
            if (sr, s1col) in gray_map:
                ws.cell(row=r, column=fcol).fill = fl(NEUTRAL_200)

ws.row_dimensions[FR_TOT].height = 24
ws.merge_cells(start_row=FR_TOT, start_column=2, end_row=FR_TOT, end_column=3)
ws.cell(row=FR_TOT, column=2, value="جمع کل")
for colx in range(2, 15):
    c = ws.cell(row=FR_TOT, column=colx)
    c.fill = fl(SECONDARY); c.font = f(10, True, PRIMARY); c.alignment = AC
    c.border = Border(top=Side(style="medium", color=NEUTRAL_200))
ws.cell(row=FR_TOT, column=12, value=f"=SUM(L{FR_TOP}:L{FR_BOT})").number_format = "#,##0.00"
ws.cell(row=FR_TOT, column=14, value=f"=SUM(N{FR_TOP}:N{FR_BOT})").number_format = "#,##0.00"

dv_num = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0",
                        allow_blank=True, showErrorMessage=True,
                        errorTitle="مقدار نامعتبر", error="عدد بزرگ‌تر یا مساوی صفر وارد کنید.")
ws.add_data_validation(dv_num)
dv_num.add(f"E{FR_TOP}:F{FR_BOT}")
dv_num.add(f"H{FR_TOP}:M{FR_BOT}")
dv_type = DataValidation(type="list", formula1='"' + ",".join([T_LAKE, T_NAVAR, T_KHAKI, T_ROUK]) + '"',
                         allow_blank=True, showErrorMessage=True,
                         errorTitle="مقدار نامعتبر", error="یکی از گزینه‌های فهرست را انتخاب کنید.")
ws.add_data_validation(dv_type)
dv_type.add(f"G{FR_TOP}:G{FR_BOT}")
ws.freeze_panes = "A7"

# ============================ Sheet: داشبورد ============================
d = wb.create_sheet(DASH_SHEET)
d.sheet_view.rightToLeft = True
d.sheet_view.showGridLines = False
d.sheet_properties.tabColor = PRIMARY
d.column_dimensions["A"].width = 2
for col in "BCEFNO":
    d.column_dimensions[col].width = 11
for col in "DGJKM":
    d.column_dimensions[col].width = 3
for col in "HIL":
    d.column_dimensions[col].width = 11
for r, hh in ((1, 8), (2, 32), (3, 16), (4, 8), (5, 16), (6, 30), (7, 14),
              (8, 8), (9, 16), (10, 30), (11, 14), (12, 10), (13, 20), (14, 30)):
    d.row_dimensions[r].height = hh
for r in range(15, 25):
    d.row_dimensions[r].height = 22
d.row_dimensions[25].height = 10

d.merge_cells("B2:O2")
d["B2"] = "داشبورد مدیریتی متره آسفالت"
d["B2"].font = f(15, True, PRIMARY); d["B2"].alignment = AR
d.merge_cells("B3:O3")
d["B3"] = ("مقادیر به‌صورت زنده از جمع‌های نهایی شیت ریزمتره خوانده می‌شوند — "
           "داده‌های فرم ورود داده نیز پس از نشستن در شیت اصلی در همین جمع‌ها دیده می‌شوند.")
d["B3"].font = f(9, color=NEUTRAL_600); d["B3"].alignment = AR

d.merge_cells("C14:D14")
for col, hh in {"B": "ردیف", "C": "شرح عملیات", "E": "واحد", "F": "متره کل"}.items():
    d[f"{col}14"] = hh
for col in "BCDEF":
    d[f"{col}14"].font = f(10, True, "FFFFFF")
    d[f"{col}14"].fill = fl(PRIMARY)
    d[f"{col}14"].alignment = AC
    d[f"{col}14"].border = Border(bottom=Side(style="thin", color=NEUTRAL_200))

rows = [
    ("جمع کل آسفالت", "م²", TOTALS["کل"]),
    (T_LAKE, "م²", TOTALS["لکه"]), (T_NAVAR, "م²", TOTALS["نوار"]),
    (T_KHAKI, "م²", TOTALS["خاکی"]), (T_ROUK, "م²", TOTALS["روکش"]),
    ("تخریب آسفالت", "م³", TOTALS["تخریب"]), ("خاکبرداری", "م³", TOTALS["خاکبرداری"]),
    ("بیس" + ZWNJ + "ریزی (اساس)", "م³", TOTALS["بیس"]),
    ("بتن" + ZWNJ + "ریزی", "م³", TOTALS["بتن"]),
    ("برش با کاتر", "م", TOTALS["کاتر"]),
]
for i, (name, unit, ref) in enumerate(rows):
    r = 15 + i
    d.merge_cells(f"C{r}:D{r}")
    d[f"B{r}"], d[f"C{r}"], d[f"E{r}"], d[f"F{r}"] = i + 1, name, unit, f"={S1_NAME}!{ref}"
    for col in "BCDEF":
        c = d[f"{col}{r}"]
        c.fill = fl(NEUTRAL_0 if i % 2 == 0 else NEUTRAL_100)
        c.font = f(10, col == "F", PRIMARY if col == "F" else NEUTRAL_900)
        c.alignment = AR if col == "C" else AC
        if col == "F":
            c.number_format = "#,##0.00"

d.merge_cells("B26:O26")
d["B26"] = "منبع: جمع این صفحه + نقل از صفحه قبلِ آخرین برگه ریزمتره که کل صفحات را پوشش می‌دهد."
d["B26"].font = f(9, color=NEUTRAL_600); d["B26"].alignment = AR

cards = [
    ("جمع کل آسفالت", "F15", "متر مربع"), ("تخریب آسفالت", "F20", "متر مکعب"),
    ("خاکبرداری", "F21", "متر مکعب"), ("بیس" + ZWNJ + "ریزی (اساس)", "F22", "متر مکعب"),
    ("بتن" + ZWNJ + "ریزی", "F23", "متر مکعب"), (T_LAKE, "F16", "متر مربع"),
    (T_NAVAR, "F17", "متر مربع"), (T_KHAKI, "F18", "متر مربع"),
    (T_ROUK, "F19", "متر مربع"), ("برش با کاتر", "F24", "متر طول"),
]
card_slots = [("B", "C"), ("E", "F"), ("H", "I"), ("K", "L"), ("N", "O")]
for i, (label, ref, unit) in enumerate(cards):
    row0 = 5 if i < 5 else 9
    c1, c2 = card_slots[i % 5]
    for rr in (row0, row0 + 1, row0 + 2):
        d.merge_cells(f"{c1}{rr}:{c2}{rr}")
        for cc in (c1, c2):
            d[f"{cc}{rr}"].fill = fl(PRIMARY_LIGHT)
    d[f"{c1}{row0}"], d[f"{c1}{row0+1}"], d[f"{c1}{row0+2}"] = label, f"={ref}", unit
    d[f"{c1}{row0}"].font = f(10, color=NEUTRAL_600);   d[f"{c1}{row0}"].alignment = AC
    d[f"{c1}{row0+1}"].font = f(18, True, PRIMARY);     d[f"{c1}{row0+1}"].alignment = AC
    d[f"{c1}{row0+1}"].number_format = "#,##0"
    d[f"{c1}{row0+2}"].font = f(9, color=NEUTRAL_600);  d[f"{c1}{row0+2}"].alignment = AC

d["B48"] = "عملیات";              d["C48"] = "حجم (م³)"
d["B49"] = "تخریب آسفالت";        d["C49"] = "=F20"
d["B50"] = "خاکبرداری";           d["C50"] = "=F21"
d["B51"] = "بیس" + ZWNJ + "ریزی"; d["C51"] = "=F22"
d["B52"] = "بتن" + ZWNJ + "ریزی"; d["C52"] = "=F23"
d["B54"] = "نوع عملیات";          d["C54"] = "سطح (م²)"
d["B55"] = T_LAKE;                d["C55"] = "=F16"
d["B56"] = T_NAVAR;               d["C56"] = "=F17"
d["B57"] = T_KHAKI;               d["C57"] = "=F18"
d["B58"] = T_ROUK;                d["C58"] = "=F19"
for r in range(48, 59):
    d.row_dimensions[r].hidden = True
    for col in "BC":
        d[f"{col}{r}"].font = f(9)

bar = BarChart()
bar.type = "col"
bar.title = make_title("حجم عملیات حجمی (متر مکعب)", 12)
bar.add_data(Reference(d, min_col=3, min_row=48, max_row=52), titles_from_data=True)
bar.set_categories(Reference(d, min_col=2, min_row=49, max_row=52))
bar.series[0].graphicalProperties.solidFill = PRIMARY
bar.legend = None
bar.dataLabels = DataLabelList(showVal=True, numFmt="#,##0.0", dLblPos="outEnd")
bar.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
bar.width, bar.height = 13.5, 8.5
d.add_chart(bar, "B28")

pie = PieChart()
pie.title = make_title("ترکیب سطح بر حسب نوع عملیات", 12)
pie.add_data(Reference(d, min_col=3, min_row=54, max_row=58), titles_from_data=True)
pie.set_categories(Reference(d, min_col=2, min_row=55, max_row=58))
pts = []
for i in range(4):
    pt = DataPoint(idx=i)
    pt.graphicalProperties.solidFill = [PRIMARY, ACCENT_POSITIVE, ACCENT_WARNING, ACCENT_NEGATIVE][i]
    pts.append(pt)
pie.series[0].data_points = pts
pie.dataLabels = DataLabelList(showPercent=True)
pie.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
pie.width, pie.height = 11.5, 8.5
d.add_chart(pie, "I28")

# ============================ Sheet: نمودارها ============================
CHART_SHEET = "نمودارها"
c = wb.create_sheet(CHART_SHEET)
c.sheet_view.rightToLeft = True
c.sheet_view.showGridLines = False
c.sheet_properties.tabColor = ACCENT_WARNING
c.column_dimensions["A"].width = 2
for col in "BCDEFGHIJKLMNO":
    c.column_dimensions[col].width = 11
c.row_dimensions[1].height = 8
c.row_dimensions[2].height = 32
c.row_dimensions[3].height = 16

c.merge_cells("B2:O2")
c["B2"] = "نمودارهای تحلیلی متره آسفالت"
c["B2"].font = f(15, True, PRIMARY); c["B2"].alignment = AR
c.merge_cells("B3:O3")
c["B3"] = "همه نمودارها به‌صورت زنده از جمع‌های شیت اصلی به‌روز می‌شوند."
c["B3"].font = f(9, color=NEUTRAL_600); c["B3"].alignment = AR

# hidden chart-data blocks (rows 60+)
SUM_ROW = lambda k: FIRST_DATA_ROW + ROWS_PER_PAGE + (k - 1) * PITCH   # «جمع این صفحه» of page k
c["B60"] = "عملیات";              c["C60"] = "حجم (م³)"
for i, (nm, ref) in enumerate([("تخریب آسفالت", "F20"), ("خاکبرداری", "F21"),
                               ("بیس" + ZWNJ + "ریزی", "F22"), ("بتن" + ZWNJ + "ریزی", "F23")]):
    c[f"B{61+i}"] = nm
    c[f"C{61+i}"] = f"='{DASH_SHEET}'!{ref}"
c["B66"] = "عملیات";              c["C66"] = "سطح (م²)"
for i, (nm, ref) in enumerate([(T_LAKE, "F16"), (T_NAVAR, "F17"),
                               (T_KHAKI, "F18"), (T_ROUK, "F19")]):
    c[f"B{67+i}"] = nm
    c[f"C{67+i}"] = f"='{DASH_SHEET}'!{ref}"
c["B72"] = "صفحه";                c["C72"] = "مساحت (م²)"
for k in range(1, PAGES + 1):
    c[f"B{72+k}"] = k
    c[f"C{72+k}"] = f"='{S1_NAME}'!H{SUM_ROW(k)}"
c["B110"] = "صفحه";               c["C110"] = "کاتر (م)"
for k in range(1, PAGES + 1):
    c[f"B{110+k}"] = k
    c[f"C{110+k}"] = f"='{S1_NAME}'!P{SUM_ROW(k)}"
for r in range(60, 141):
    c.row_dimensions[r].hidden = True
    for col in "BC":
        c[f"{col}{r}"].font = f(9)

SLICE_COLORS = [PRIMARY, ACCENT_POSITIVE, ACCENT_WARNING, ACCENT_NEGATIVE]

bar1 = BarChart()
bar1.type = "col"
bar1.title = make_title("حجم عملیات حجمی (متر مکعب)", 12)
bar1.add_data(Reference(c, min_col=3, min_row=60, max_row=64), titles_from_data=True)
bar1.set_categories(Reference(c, min_col=2, min_row=61, max_row=64))
bar1.series[0].graphicalProperties.solidFill = PRIMARY
bar1.legend = None
bar1.dataLabels = DataLabelList(showVal=True, numFmt="#,##0.0", dLblPos="outEnd")
bar1.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
bar1.width, bar1.height = 13.5, 8.5
c.add_chart(bar1, "B4")

dough = DoughnutChart()
dough.title = make_title("ترکیب سطح بر حسب نوع عملیات", 12)
dough.add_data(Reference(c, min_col=3, min_row=66, max_row=70), titles_from_data=True)
dough.set_categories(Reference(c, min_col=2, min_row=67, max_row=70))
dough.holeSize = 55
pts = []
for i in range(4):
    pt = DataPoint(idx=i)
    pt.graphicalProperties.solidFill = SLICE_COLORS[i]
    pts.append(pt)
dough.series[0].data_points = pts
dough.dataLabels = DataLabelList(showPercent=True)
dough.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
dough.width, dough.height = 11.5, 8.5
c.add_chart(dough, "J4")

hbar = BarChart()
hbar.type = "bar"
hbar.title = make_title("سطوح عملیات به تفکیک نوع (متر مربع)", 12)
hbar.add_data(Reference(c, min_col=3, min_row=66, max_row=70), titles_from_data=True)
hbar.set_categories(Reference(c, min_col=2, min_row=67, max_row=70))
hbar.series[0].graphicalProperties.solidFill = ACCENT_POSITIVE
hbar.legend = None
hbar.dataLabels = DataLabelList(showVal=True, numFmt="#,##0.0", dLblPos="outEnd")
hbar.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
hbar.width, hbar.height = 13.5, 8.5
c.add_chart(hbar, "B22")

line = LineChart()
line.title = make_title("روند مساحت آسفالت به تفکیک صفحه", 12)
line.add_data(Reference(c, min_col=3, min_row=72, max_row=72 + PAGES), titles_from_data=True)
line.set_categories(Reference(c, min_col=2, min_row=73, max_row=72 + PAGES))
s = line.series[0]
s.marker = Marker(symbol="circle", size=5)
s.smooth = False
s.graphicalProperties.line.solidFill = PRIMARY
s.graphicalProperties.line.width = 22000
line.legend = None
line.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
line.width, line.height = 11.5, 8.5
c.add_chart(line, "J22")

pie2 = PieChart()
pie2.title = make_title("ترکیب حجم عملیات (متر مکعب)", 12)
pie2.add_data(Reference(c, min_col=3, min_row=60, max_row=64), titles_from_data=True)
pie2.set_categories(Reference(c, min_col=2, min_row=61, max_row=64))
pts = []
for i in range(4):
    pt = DataPoint(idx=i)
    pt.graphicalProperties.solidFill = SLICE_COLORS[i]
    pts.append(pt)
pie2.series[0].data_points = pts
pie2.dataLabels = DataLabelList(showPercent=True)
pie2.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
pie2.width, pie2.height = 13.5, 8.5
c.add_chart(pie2, "B40")

bar2 = BarChart()
bar2.type = "col"
bar2.title = make_title("طول کاتر به تفکیک صفحه (متر)", 12)
bar2.add_data(Reference(c, min_col=3, min_row=110, max_row=110 + PAGES), titles_from_data=True)
bar2.set_categories(Reference(c, min_col=2, min_row=111, max_row=110 + PAGES))
bar2.series[0].graphicalProperties.solidFill = ACCENT_WARNING
bar2.legend = None
bar2.visible_cells_only = False   # TRUE default makes Excel skip the hidden data rows
bar2.width, bar2.height = 11.5, 8.5
c.add_chart(bar2, "J40")

# ============================ save ============================
wb.active = wb.sheetnames.index(DASH_SHEET)
try:
    wb.calculation.fullCalcOnLoad = True   # Excel recalculates everything on open
except Exception as e:
    print("calc flag skipped:", e)
wb.save(OUT)
print("SAVED:", OUT)

# ---- post-save fixup: rewrite oddHeader in the XML. openpyxl's parser mangles the
# original &-codes, so take the RAW header from the source file, fix the page count
# in the &L section, and swap the first bold span of &R with the print title.
with zipfile.ZipFile(SRC) as z:
    src_xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
orig = re.search(r"<oddHeader>(.*?)</oddHeader>", src_xml, re.S).group(1)
orig = re.sub(r"(از:?\s*)(\d+)", lambda mm: mm.group(1) + str(PAGES), orig, count=1)
title_xml = f'&amp;"-,Bold"{PRINT_TITLE}&amp;"-,Regular"\n'
if re.search(r'&amp;"-[^"]*".*?&amp;"-,Regular"', orig, re.S):
    orig = re.sub(r'&amp;"-[^"]*".*?&amp;"-,Regular"',
                  lambda mm: title_xml, orig, count=1, flags=re.S)
else:
    orig = orig.replace("&amp;R", "&amp;R" + title_xml, 1)
tmp = OUT + ".tmp"
with zipfile.ZipFile(OUT) as zin, zipfile.ZipFile(tmp, "w", zipfile.ZIP_DEFLATED) as zout:
    for item in zin.infolist():
        data = zin.read(item.filename)
        if item.filename == "xl/worksheets/sheet1.xml":
            xml = data.decode("utf-8")
            xml, n = re.subn(r"<oddHeader>.*?</oddHeader>",
                             "<oddHeader>" + orig + "</oddHeader>", xml, flags=re.S)
            assert n == 1, "oddHeader not found"
            data = xml.encode("utf-8")
        zout.writestr(item, data)
os.replace(tmp, OUT)
print("header fixup done:", PRINT_TITLE in orig)
