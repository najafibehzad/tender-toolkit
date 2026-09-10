# -*- coding: utf-8 -*-
"""ساخت فایل اکسل «چک لیست امور پیمان» — شرکت پیمانکاری رتبه ۵ راه و ابنیه"""
import sys, os

XLSX_SKILL_DIR = r"C:\Users\behzad\.zcode\cli\plugins\cache\zcode-plugins-official\document-skills\0.1.4\skills\xlsx"
for sub in [XLSX_SKILL_DIR, os.path.join(XLSX_SKILL_DIR, "templates")]:
    if sub not in sys.path:
        sys.path.insert(0, sub)

import base
# فونت فارسی: تahoma روی ویندوز همیشه موجود است و فارسی را عالی رندر می‌کند
base.FONT_NAME = "Tahoma"
base.HEADER_BOLD = True

from openpyxl import Workbook
from openpyxl.styles import PatternFill, Alignment, Font
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.formatting.rule import CellIsRule
from base import (setup_sheet, style_header_row, style_data_row, style_total_row,
                  auto_fit_columns, auto_fit_row_heights, font_caption, font_subheader,
                  font_body, fill_data_row, align_text, align_number, align_date)

OUT = r"C:\Users\behzad\OneDrive\Desktop\چک لیست امور پیمان.xlsx"
INPUT_FILL = PatternFill("solid", fgColor="FEF9E7")   # کهربایی کم‌رنگ = ورودی دستی
RIAL = "#,##0"
PCT = "0%"

SH_HELP = "راهنما"
SH_CHK  = "چک لیست پروژه"
SH_MO   = "مواعد تکرارشونده"
SH_CAP  = "ظرفیت ساجات"
SH_GUR  = "تضامین و سپرده ها"
SH_TAX  = "مالیات قراردادها"
SH_INV  = "صورت وضعیت ها"
SH_REV  = "کنترل"

wb = Workbook()

def rtl(ws):
    ws.sheet_view.rightToLeft = True

def write_row(ws, row, values, col_start=2):
    for i, v in enumerate(values):
        ws.cell(row=row, column=col_start + i, value=v)

def set_align(ws, row, col, kind="text"):
    c = ws.cell(row=row, column=col)
    if kind == "text":
        c.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
    elif kind == "number":
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    elif kind == "date":
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)

def section_title(ws, row, text, last_col):
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=last_col)
    c = ws.cell(row=row, column=2, value=text)
    c.font = Font(name=base.FONT_NAME, size=12, bold=True, color=base.PRIMARY)
    c.alignment = Alignment(horizontal="right", vertical="center")
    ws.row_dimensions[row].height = 24

def caption(ws, row, text, last_col):
    ws.merge_cells(start_row=row, start_column=2, end_row=row, end_column=last_col)
    c = ws.cell(row=row, column=2, value=text)
    c.font = font_caption()
    c.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 30

# ============================================================
# شیت ۱: راهنما
# ============================================================
ws = wb.active
ws.title = SH_HELP
rtl(ws)
setup_sheet(ws, title="چک لیست امور پیمان — شرکت پیمانکاری رتبه ۵ راه و ابنیه", last_col=6)
lines = [
    ("نسخه: شهریور ۱۴۰۵ | این فایل ابزار مدیریتی امور پیمان است", False),
    ("", False),
    ("شیت‌ها و کاربرد هرکدام", True),
    ("۱) چک لیست پروژه — ۳۶ اقدام کلیدی از مذاکره تا تسویه؛ برای هر پروژه جدید وضعیت‌ها را به‌روز کنید", False),
    ("۲) مواعد تکرارشونده — تکالیف ماهانه، فصلی و سالانه مالیاتی/بیمه‌ای/سامانه‌ای", False),
    ("۳) ظرفیت ساجات — کنترل ظرفیت مجاز رتبه ۵ (مبلغ + تعداد ۳ کار هم‌زمان) به‌صورت خودکار", False),
    ("۴) تضامین و سپرده ها — سررسید، تمدید و آزادسازی تضمین‌ها", False),
    ("۵) مالیات قراردادها — برآورد ماده ۱۰۹ و کسر ماده ۱۰۳ و کنترل تفکیک مصالح/حق‌الزحمه", False),
    ("۶) صورت وضعیت ها — پیگیری تصویب و پرداخت و کنترل تأخیرها", False),
    ("۷) کنترل — بررسی خودکار صحت فرمول‌ها؛ همه ردیف‌ها باید «تأیید» باشند", False),
    ("", False),
    ("نکات استفاده", True),
    ("• سلول‌های با پس‌زمینه کهربایی کم‌رنگ = ورودی دستی؛ سالانه با بخشنامه جدید به‌روزرسانی کنید", False),
    ("• ستون‌های «وضعیت» دراپ‌داون دارند؛ رنگ سبز = انجام/تأیید، کهربایی = در جریان، قرمز = معلق/هشدار", False),
    ("• تاریخ‌ها را شمسی وارد کنید (مثل ۱۴۰۵/۰۶/۱۵)؛ ستون‌های «تأخیر» به‌صورت دستی بر حسب روز پر می‌شوند", False),
    ("• مبالغ همه به ریال است", False),
    ("", False),
    ("هشدار مهم", True),
    ("ظرفیت مجاز، نرخ مالیات بر ارزش افزوده، معافیت حقوق و سقف علی‌الحساب هر سال با قانون بودجه و "
     "بخشنامه‌های جدید تغییر می‌کند. اعداد پیش‌فرض این فایل «مبنای ۱۴۰۴/۱۴۰۵» است؛ پیش از اتکا از سامانه ساجات، "
     "سازمان برنامه و بودجه (shaghool.ir) و سازمان امور مالیاتی (tax.gov.ir) به‌روزرسانی کنید. "
     "این فایل جایگزین مشاوره حقوقی/مالیاتی رسمی نیست.", False),
]
r = 4
for text, is_head in lines:
    if text == "":
        r += 1
        continue
    if is_head:
        section_title(ws, r, text, 6)
    else:
        ws.merge_cells(start_row=r, start_column=2, end_row=r, end_column=6)
        c = ws.cell(row=r, column=2, value=text)
        c.font = font_body()
        c.alignment = Alignment(horizontal="right", vertical="center", wrap_text=True)
    ws.row_dimensions[r].height = 30 if not is_head else 24
    r += 1
for col, w in zip("BCDEF", (22, 22, 22, 22, 22)):
    ws.column_dimensions[col].width = w
auto_fit_row_heights(ws, header_row=2, data_start_row=4)

# ============================================================
# شیت ۲: چک لیست پروژه
# ============================================================
ws = wb.create_sheet(SH_CHK)
rtl(ws)
headers = ["ردیف", "مرحله", "اقدام کلیدی", "مرجع / سامانه", "مهلت / زمان‌بندی", "مسئول", "وضعیت", "تاریخ انجام", "یادداشت"]
last_col = len(headers) + 1  # =10
setup_sheet(ws, title="چک لیست اقدامات هر پروژه — از مذاکره تا تسویه", last_col=last_col)
write_row(ws, 4, headers)
style_header_row(ws, 4, 2, last_col)

items = [
    ("پیش از قرارداد", "بررسی اعتبار مالی کارفرما و منبع اعتبار طرح (عمرانی / غیرعمرانی / ماده ۳۲)", "ماده ۲۶ ق.بودجه — مواد ۳۰-۳۲ قانون تسهیل", "پیش از پیشنهاد", "مدیرعامل"),
    ("پیش از قرارداد", "کنترل ظرفیت باقیمانده ساجات در رشته مربوطه (مبلغ + تعداد ۳ کار)", "سامانه ساجات", "پیش از عقد", "امور پیمان"),
    ("پیش از قرارداد", "بررسی روش واگذاری (مناقصه / مذاکره‌ای) و سقف مجاز مذاکره‌ای رتبه ۵", "قانون مناقصات — بخشنامه رتبه ۵", "پیش از عقد", "امور پیمان"),
    ("پیش از قرارداد", "اخذ فهرست بهای روز و ضرایب (بالاسری، منطقه‌ای، فصلی)", "سازمان برنامه و بودجه", "پیش از برآورد", "دفتر فنی"),
    ("پیش از قرارداد", "برآورد نقدینگی پروژه: پیش‌پرداخت، علی‌الحساب ماده ۳۰، دورة وصول", "قرارداد", "پیش از عقد", "مالی"),
    ("پیش از قرارداد", "مذاکره شرط تعدیل / افزایش بها حتی در قرارداد مذاکره‌ای", "ماده ۲۲ شپا", "پیش از عقد", "مدیرعامل"),
    ("پیش از قرارداد", "شفاف‌سازی مسئول بار ارزش افزوده در متن قرارداد (روی مبلغ یا در مبلغ)", "قانون م.ا.ا", "پیش از عقد", "مالی"),
    ("عقد قرارداد", "تفکیک مصالح از حق‌الزحمه در متن قرارداد و صورت وضعیت‌ها", "ماده ۱۰۹ ق.م.م", "هنگام تنظیم", "امور پیمان"),
    ("عقد قرارداد", "ارائه تعهدنامه دفاتری برای کسر ۳٪ به‌جای ۵٪", "ماده ۱۰۳ ق.م.م", "هنگام تنظیم", "مالی"),
    ("عقد قرارداد", "کنترل تضامین: مناقصه ۳٪ / پیش‌پرداخت ۱۰٪ / حسن انجام کار ۱۰٪", "ماده ۱۴ قانون تسهیل", "هنگام تنظیم", "امور پیمان"),
    ("عقد قرارداد", "کنترل مهلت پرداخت پس از تصویب صورت وضعیت در شرایط خصوصی", "شرایط خصوصی پیمان", "هنگام تنظیم", "امور پیمان"),
    ("عقد قرارداد", "کنترل سقف جرائم تأخیر (۱۰٪) و مبنای شروع روزشمار", "ماده ۱۱ برگ ۲ شپا", "هنگام تنظیم", "امور پیمان"),
    ("عقد قرارداد", "تعیین مرجع حل اختلاف و مهلت‌های اعتراض", "ماده ۴۹ شپا — شورای فنی و حرفه‌ای", "هنگام تنظیم", "مدیرعامل"),
    ("عقد قرارداد", "ثبت قرارداد در ساجات — تأخیر یعنی قفل ظرفیت!", "ساجات", "حداکثر ۹۰ روز پس از امضا", "امور پیمان"),
    ("عقد قرارداد", "ثبت قرارداد در سامانه پیام مالیاتی", "my.tax.gov.ir", "پس از امضا و پیش از اولین پرداخت", "مالی"),
    ("حین اجرا", "صورت وضعیت ماهانه منظم و پیگیری تصویب در مهلت مقرر", "ماده ۳۵ شپا", "ماهانه", "امور پیمان"),
    ("حین اجرا", "ثبت هر صورت وضعیت در سامانه پیام", "سامانه پیام", "ماهانه", "مالی"),
    ("حین اجرا", "مکاتبات مکتوب و تاریخ‌دار (تحویل کارگاه، تعویق، دستورالعمل‌ها)", "ماده ۲۴ شپا", "مستمر", "امور پیمان"),
    ("حین اجرا", "روزشمار تأخیرات کارفرما (مبنای مطالبه خسارت)", "ماده ۲۴ شپا", "مستمر", "امور پیمان"),
    ("حین اجرا", "پیگیری پرداخت علی‌الحساب کارکرد", "ماده ۳۰ قانون تسهیل", "مستمر", "مالی"),
    ("حین اجرا", "کنترل انقضای تضامین و تمدید به‌موقع", "شیت تضامین و سپرده ها", "ماهانه", "امور پیمان"),
    ("حین اجرا", "لیست بیمه ماهانه و کنترل بدهی تأمین اجتماعی", "قانون تأمین اجتماعی", "ماهانه", "مالی"),
    ("حین اجرا", "خرید مصالح با صورتحساب الکترونیکی و از حساب رسمی", "سامانه مودیان — ماده ۱۶۹", "مستمر", "مالی"),
    ("حین اجرا", "اظهارنامه ارزش افزوده فصلی", "قانون م.ا.ا", "۱۵ روز پس از پایان فصل", "مالی"),
    ("حین اجرا", "پرداخت مالیات حقوق کارکنان", "مواد ۸۵ و ۸۶ ق.م.م", "پایان ماه بعد", "مالی"),
    ("حین اجرا", "آرشیو مستندات پروژه برای پرونده ارتقا به رتبه ۴", "ساجات", "مستمر", "دفتر فنی"),
    ("پایان کار", "اعلام آمادگی مکتوب برای تحویل موقت", "ماده ۲۶ شپا", "پس از اتمام کار", "امور پیمان"),
    ("پایان کار", "پیگیری صورتجلسه تحویل موقت", "ماده ۴۳ شپا", "حداکثر ۳۰ روز از اعلام", "امور پیمان"),
    ("پایان کار", "آزادسازی تدریجی سپرده حسن انجام کار", "ماده ۴۷ شپا", "پس از تحویل موقت", "امور پیمان"),
    ("پایان کار", "رفع نقص و پیگیری تحویل قطعی", "ماده ۴۶ شپا", "طبق قرارداد", "دفتر فنی"),
    ("پایان کار", "پیگیری گواهی سرانجام کار و اعتراض در مهلت (~۳ ماه)", "ماده ۳۹ قانون تسهیل", "پس از ابلاغ گواهی", "امور پیمان"),
    ("پایان کار", "تسویه بیمه‌ای و آزادسازی تضمین اسناد (۱۰٪ / ۵٪ عمرانی)", "ماده ۳۸ قانون تأمین", "پیش از تسویه", "مالی"),
    ("پایان کار", "دریافت گواهی کسر ماده ۱۰۳ نهایی و تسویه مالیاتی", "سامانه پیام", "پیش از تسویه", "مالی"),
    ("پایان کار", "جمع مازاد کسر مالیات و درخواست استرداد / اعتبار", "ماده ۲۲۶ ق.م.م", "پس از اظهارنامه عملکرد", "مالی"),
    ("پایان کار", "استرداد اعتبار ارزش افزوده خریدها (طرح عمرانی معاف)", "ماده ۱۸ قانون م.ا.ا", "پس از تسویه", "مالی"),
    ("پایان کار", "ثبت نهایی پروژه در ساجات و آزادسازی ظرفیت", "ساجات", "پس از تسویه", "امور پیمان"),
]
data_start = 5
for i, (phase, action, ref, timing, owner) in enumerate(items):
    r = data_start + i
    write_row(ws, r, [i + 1, phase, action, ref, timing, owner, "شروع نشده", "", ""])
    set_align(ws, r, 2, "number"); set_align(ws, r, 3, "text"); set_align(ws, r, 4, "text")
    set_align(ws, r, 5, "text"); set_align(ws, r, 6, "text"); set_align(ws, r, 7, "text")
    set_align(ws, r, 8, "number"); set_align(ws, r, 9, "date"); set_align(ws, r, 10, "text")
    style_data_row(ws, r, 2, last_col, i)
data_end = data_start + len(items) - 1

dv_status = DataValidation(type="list", formula1='"شروع نشده,در حال انجام,انجام شد,معلق"', allow_blank=True)
ws.add_data_validation(dv_status)
dv_status.add(f"H{data_start}:H{data_end + 20}")

rng = f"H{data_start}:H{data_end + 20}"
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"انجام شد"'],
    fill=base.CF_POSITIVE_FILL, font=base.CF_POSITIVE_FONT))
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"در حال انجام"'],
    fill=base.CF_WARNING_FILL, font=base.CF_WARNING_FONT))
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"معلق"'],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))

caption(ws, data_end + 2,
        "ستون وضعیت را از دراپ‌داون انتخاب کنید. برای هر پروژه جدید، می‌توانید این شیت را کپی کنید یا ستون یادداشت را با شماره پروژه پر کنید.", last_col)
ws.freeze_panes = "C5"
auto_fit_columns(ws, min_width=9, max_width=30, header_row=4, data_start_row=5)
ws.column_dimensions["D"].width = 46
ws.column_dimensions["E"].width = 30
ws.column_dimensions["F"].width = 22
ws.column_dimensions["J"].width = 26
auto_fit_row_heights(ws, header_row=4, data_start_row=5)
ws.page_setup.orientation = "landscape"
ws.page_setup.fitToWidth = 1
ws.page_setup.fitToHeight = 0

# ============================================================
# شیت ۳: مواعد تکرارشونده
# ============================================================
ws = wb.create_sheet(SH_MO)
rtl(ws)
headers = ["تکلیف", "دوره", "مهلت قانونی", "توضیح", "وضعیت"]
last_col = len(headers) + 1  # 6
setup_sheet(ws, title="مواعد تکرارشونده مالیاتی، بیمه‌ای و سامانه‌ای", last_col=last_col)
write_row(ws, 4, headers)
style_header_row(ws, 4, 2, last_col)
duties = [
    ("ثبت قرارداد در ساجات", "هر قرارداد", "۹۰ روز پس از امضا", "تأخیر = قفل ظرفیت، حذف امتیاز ارتقا و ریسک محرومیت"),
    ("ثبت قرارداد در سامانه پیام", "هر قرارداد", "پیش از اولین پرداخت", "بدون ثبت، گواهی کسر ماده ۱۰۳ صادر نمی‌شود"),
    ("ثبت صورت وضعیت در سامانه پیام", "ماهانه", "هم‌زمان با ارائه", "مبنای تطبیق درآمد اظهاری در حسابرسی"),
    ("اظهارنامه ارزش افزوده", "فصلی", "۱۵ روز پس از پایان فصل", "جرائم: ۱۰٪ عدم تسلیم + ۱۰٪ عدم پرداخت + ۲٪ در ماه"),
    ("مالیات حقوق کارکنان", "ماهانه", "پایان ماه بعد", "معافیت سالانه طبق قانون بودجه"),
    ("لیست بیمه و پرداخت حق بیمه", "ماهانه", "پایان ماه بعد", "تسویه بیمه‌ای شرط تسویه پیمان (ماده ۳۸)"),
    ("کسر ماده ۱۰۳ از پیمانکار فرعی", "هر پرداخت", "۳۰ روز", "شما نسبت به فرعی «کارفرما» محسوب می‌شوید"),
    ("اظهارنامه عملکرد", "سالانه", "تا پایان تیر", "همراه گواهی‌های کسر ماده ۱۰۳"),
    ("جمع مازاد کسر و درخواست استرداد", "سالانه", "پس از اظهارنامه عملکرد", "مازاد کسر ۱۰۳ نسبت به مالیات نهایی، قابل استرداد/اعتبار است"),
    ("به‌روزرسانی ظرفیت مجاز سالانه", "سالانه", "با ابلاغ بخشنامه جدید", "شیت «ظرفیت ساجات» را با عدد ساجات به‌روز کنید"),
    ("تمدید / اعتبارسنجی صلاحیت رتبه", "طبق ابلاغ ساجات", "طبق ابلاغ", "کنترل اعتبار گواهینامه رتبه در هر دو رشته"),
]
data_start = 5
for i, row in enumerate(duties):
    r = data_start + i
    write_row(ws, r, list(row) + ["به‌موقع"])
    set_align(ws, r, 2, "text"); set_align(ws, r, 3, "text"); set_align(ws, r, 4, "text")
    set_align(ws, r, 5, "text"); set_align(ws, r, 6, "number")
    style_data_row(ws, r, 2, last_col, i)
data_end = data_start + len(duties) - 1
dv_ok = DataValidation(type="list", formula1='"به‌موقع,در حال انجام,تأخیر"', allow_blank=True)
ws.add_data_validation(dv_ok)
dv_ok.add(f"F{data_start}:F{data_end + 10}")
rng = f"F{data_start}:F{data_end + 10}"
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"به‌موقع"'],
    fill=base.CF_POSITIVE_FILL, font=base.CF_POSITIVE_FONT))
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"در حال انجام"'],
    fill=base.CF_WARNING_FILL, font=base.CF_WARNING_FONT))
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"تأخیر"'],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
ws.freeze_panes = "C5"
auto_fit_columns(ws, min_width=10, max_width=34, header_row=4, data_start_row=5)
ws.column_dimensions["E"].width = 44
auto_fit_row_heights(ws, header_row=4, data_start_row=5)

# ============================================================
# شیت ۴: ظرفیت ساجات
# ============================================================
ws = wb.create_sheet(SH_CAP)
rtl(ws)
last_col = 8
setup_sheet(ws, title="کنترل ظرفیت مجاز پیمانکاری — پایه ۵ (ساجات)", last_col=last_col)

section_title(ws, 4, "۱) ظرفیت سالانه — ورودی دستی (به‌روزرسانی با بخشنامه/ساجات هر سال)", last_col)
write_row(ws, 5, ["رشته", "ظرفیت مجاز سالانه (ریال)", "ملاحظات"])
style_header_row(ws, 5, 2, 4)
write_row(ws, 6, ["راه و ترابری", 1053091800000, "مبنای ۱۴۰۴ — از پنل ساجات خود تأیید کنید"])
write_row(ws, 7, ["ابنیه و ساختمان", 702061200000, "مبنای ۱۴۰۴ — از پنل ساجات خود تأیید کنید"])
write_row(ws, 8, ["تعداد کار مجاز هم‌زمان (پایه ۵)", 3, "از ابتدای ۱۴۰۳"])
for i, r in enumerate((6, 7, 8)):
    style_data_row(ws, r, 2, 4, i)
    set_align(ws, r, 3, "number")
    ws.cell(row=r, column=3).number_format = RIAL if r < 8 else "0"
    ws.cell(row=r, column=3).fill = INPUT_FILL

section_title(ws, 10, "۲) کارهای در دست اجرا — با هر قرارداد جدید یک ردیف اضافه کنید", last_col)
write_row(ws, 11, ["ردیف", "نام پروژه", "رشته", "مبلغ قرارداد (ریال)", "وضعیت", "تاریخ ثبت در ساجات", "یادداشت"])
style_header_row(ws, 11, 2, last_col)
cap_start, cap_end = 12, 31
for i in range(cap_start, cap_end + 1):
    write_row(ws, i, [i - 11, "", "", "", "در دست اجرا", "", ""])
    style_data_row(ws, i, 2, last_col, i - cap_start)
    set_align(ws, i, 2, "number"); set_align(ws, i, 5, "number"); set_align(ws, i, 7, "date")
    ws.cell(row=i, column=5).number_format = RIAL

dv_reshteh = DataValidation(type="list", formula1='"راه و ترابری,ابنیه و ساختمان,تاسیسات و تجهیزات"', allow_blank=True)
dv_state = DataValidation(type="list", formula1='"در دست اجرا,خاتمه یافته"', allow_blank=True)
ws.add_data_validation(dv_reshteh); ws.add_data_validation(dv_state)
dv_reshteh.add(f"D{cap_start}:D{cap_end}")
dv_state.add(f"F{cap_start}:F{cap_end}")

section_title(ws, 33, "۳) جمع‌بندی (خودکار — دست نزنید)", last_col)
write_row(ws, 34, ["شرح", "راه و ترابری", "ابنیه و ساختمان"])
style_header_row(ws, 34, 2, 4)
rows_sum = [
    ("ظرفیت مصرفی (کارهای در دست اجرا)",
     f'=SUMIFS($E${cap_start}:$E${cap_end},$D${cap_start}:$D${cap_end},"راه و ترابری",$F${cap_start}:$F${cap_end},"در دست اجرا")',
     f'=SUMIFS($E${cap_start}:$E${cap_end},$D${cap_start}:$D${cap_end},"ابنیه و ساختمان",$F${cap_start}:$F${cap_end},"در دست اجرا")', RIAL),
    ("ظرفیت باقیمانده (منفی = ظرفیت تکمیل!)", "=C6-C35", "=C7-D35", RIAL),
    ("تعداد کارهای در دست اجرا (کل شرکت)",
     f'=COUNTIFS($F${cap_start}:$F${cap_end},"در دست اجرا")', "محدودیت پایه ۵: ۳ کار", "0"),
    ("ظرفیت باقیمانده تعداد کار (منفی = توقف!)", "=C8-C37", "", "0"),
]
for i, (label, f1, f2, fmt) in enumerate(rows_sum):
    r = 35 + i
    write_row(ws, r, [label, f1, f2])
    style_data_row(ws, r, 2, 4, i)
    set_align(ws, r, 2, "text"); set_align(ws, r, 3, "number"); set_align(ws, r, 4, "number")
    ws.cell(row=r, column=3).number_format = fmt
    if isinstance(f2, str) and f2.startswith("="):
        ws.cell(row=r, column=4).number_format = fmt
caption(ws, 40, "قراردادهای خصوصی هم ظرفیت ساجات را مصرف می‌کنند؛ همه قراردادها را ثبت کنید. "
                "شرکت تازه‌تأسیس پایه ۵ در سال اول فقط مجاز به ۲۰٪ ظرفیت مالی است.", last_col)
ws.conditional_formatting.add("C36:D36", CellIsRule(operator="lessThan", formula=["0"],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
ws.conditional_formatting.add("C38:C38", CellIsRule(operator="lessThan", formula=["0"],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
auto_fit_columns(ws, min_width=10, max_width=34, header_row=5, data_start_row=6)
ws.column_dimensions["B"].width = 34
ws.column_dimensions["C"].width = 24
ws.column_dimensions["D"].width = 24
ws.column_dimensions["E"].width = 20
ws.column_dimensions["H"].width = 24
auto_fit_row_heights(ws, header_row=5, data_start_row=6)

# ============================================================
# شیت ۵: تضامین و سپرده ها
# ============================================================
ws = wb.create_sheet(SH_GUR)
rtl(ws)
headers = ["پروژه", "نوع تضمین", "درصد", "مبلغ پیمان (ریال)", "مبلغ تضمین (ریال)", "تاریخ انقضا", "وضعیت", "تاریخ آزادسازی", "یادداشت"]
last_col = len(headers) + 1  # 10
setup_sheet(ws, title="پیگیری تضامین و سپرده‌ها", last_col=last_col)
write_row(ws, 4, headers)
style_header_row(ws, 4, 2, last_col)
gur_start, gur_end = 5, 19
for i in range(gur_start, gur_end + 1):
    r = i
    write_row(ws, r, ["", "", 0.10, "", f'=IF(OR(D{r}="",E{r}=""),"",D{r}*E{r})', "", "فعال", "", ""])
    style_data_row(ws, r, 2, last_col, i - gur_start)
    set_align(ws, r, 4, "number"); set_align(ws, r, 5, "number"); set_align(ws, r, 6, "number")
    set_align(ws, r, 7, "date"); set_align(ws, r, 8, "number"); set_align(ws, r, 9, "date")
    ws.cell(row=r, column=4).number_format = PCT
    ws.cell(row=r, column=5).number_format = RIAL
    ws.cell(row=r, column=6).number_format = RIAL
# نمونه
write_row(ws, gur_start, ["نمونه: پروژه الف", "حسن انجام کار", 0.10, 300000000000,
                          f'=IF(OR(D{gur_start}="",E{gur_start}=""),"",D{gur_start}*E{gur_start})',
                          "۱۴۰۵/۱۲/۲۹", "فعال", "", "این ردیف نمونه است؛ اطلاعات خود را جایگزین کنید"])
dv_type = DataValidation(type="list", formula1='"شرکت در مناقصه,پیش پرداخت,حسن انجام کار,بیمه ماده ۳۸"', allow_blank=True)
dv_gstate = DataValidation(type="list", formula1='"فعال,تمدید شد,آزاد شد"', allow_blank=True)
ws.add_data_validation(dv_type); ws.add_data_validation(dv_gstate)
dv_type.add(f"C{gur_start}:C{gur_end}")
dv_gstate.add(f"H{gur_start}:H{gur_end}")
rng = f"H{gur_start}:H{gur_end}"
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"آزاد شد"'],
    fill=base.CF_POSITIVE_FILL, font=base.CF_POSITIVE_FONT))
ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"تمدید شد"'],
    fill=base.CF_WARNING_FILL, font=base.CF_WARNING_FONT))
caption(ws, gur_end + 2, "درصدهای متعارف (ماده ۱۴ قانون تسهیل): شرکت در مناقصه ۳٪ — پیش‌پرداخت ۱۰٪ — حسن انجام کار ۱۰٪ — "
                          "تضمین اسناد بیمه ماده ۳۸: ۱۰٪ (طرح‌های عمرانی ۵٪). آزادسازی حسن انجام کار طبق ماده ۴۷ شپا تدریجی است.", last_col)
ws.freeze_panes = "C5"
auto_fit_columns(ws, min_width=9, max_width=30, header_row=4, data_start_row=5)
ws.column_dimensions["B"].width = 24
ws.column_dimensions["E"].width = 20
ws.column_dimensions["F"].width = 20
ws.column_dimensions["J"].width = 30
auto_fit_row_heights(ws, header_row=4, data_start_row=5)

# ============================================================
# شیت ۶: مالیات قراردادها
# ============================================================
ws = wb.create_sheet(SH_TAX)
rtl(ws)
headers = ["پروژه", "کارفرما", "مبلغ کل قرارداد (ریال)", "مصالح تأمین کارفرما (ریال)", "حق‌الزحمه (ریال)",
           "درآمد مشمول ماده ۱۰۹ (۱۲٪ حق‌الزحمه)", "مالیات عملکرد تقریبی (۲۵٪)", "نرخ کسر ماده ۱۰۳",
           "کسر سالانه تقریبی", "ثبت در سامانه پیام", "یادداشت"]
last_col = len(headers) + 1  # 12
setup_sheet(ws, title="برآورد مالیاتی هر قرارداد (تقریبی — برای مدیریت نقدینگی)", last_col=last_col)
write_row(ws, 4, headers)
style_header_row(ws, 4, 2, last_col)
tax_start, tax_end = 5, 12
for r in range(tax_start, tax_end + 1):
    write_row(ws, r, ["", "", "", "", f'=IF(D{r}="","",D{r}-E{r})',
                      f'=IF(F{r}="","",F{r}*0.12)', f'=IF(G{r}="","",G{r}*0.25)',
                      0.03, f'=IF(D{r}="","",D{r}*I{r})', "بله", ""])
    style_data_row(ws, r, 2, last_col, r - tax_start)
    for col, fmt in ((4, RIAL), (5, RIAL), (6, RIAL), (7, RIAL), (8, RIAL), (9, PCT), (10, RIAL)):
        set_align(ws, r, col, "number")
        ws.cell(row=r, column=col).number_format = fmt
    set_align(ws, r, 11, "number")
    for col in (4, 5, 9):
        ws.cell(row=r, column=col).fill = INPUT_FILL
tax_total = tax_end + 1
write_row(ws, tax_total, ["جمع", "", f"=SUM(D{tax_start}:D{tax_end})", f"=SUM(E{tax_start}:E{tax_end})",
                          f"=SUM(F{tax_start}:F{tax_end})", f"=SUM(G{tax_start}:G{tax_end})",
                          f"=SUM(H{tax_start}:H{tax_end})", "", f"=SUM(J{tax_start}:J{tax_end})", "", ""])
style_total_row(ws, tax_total, 2, last_col)
for col in (4, 5, 6, 7, 8, 10):
    ws.cell(row=tax_total, column=col).number_format = RIAL
dv_client = DataValidation(type="list", formula1='"دولتی,خصوصی"', allow_blank=True)
dv_rate = DataValidation(type="list", formula1='"0.03,0.05"', allow_blank=True)
dv_msg = DataValidation(type="list", formula1='"بله,خیر"', allow_blank=True)
for dv, colrng in ((dv_client, f"C{tax_start}:C{tax_end}"), (dv_rate, f"I{tax_start}:I{tax_end}"),
                   (dv_msg, f"K{tax_start}:K{tax_end}")):
    ws.add_data_validation(dv)
    dv.add(colrng)
ws.conditional_formatting.add(f"K{tax_start}:K{tax_end}", CellIsRule(operator="equal", formula=['"خیر"'],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
caption(ws, tax_total + 2, "محاسبات تقریبی است: ماده ۱۰۹ فقط حق‌الزحمه را مشمول ۱۲٪ می‌کند (مصالح کارفرما ۱/۵٪)؛ "
                            "اگر هر دو طرف قرارداد دستگاه دولتی باشند نرخ ۴٪ روی کل مبلغ اعمال می‌شود. کسر تقریبی ماده ۱۰۳ = کل قرارداد × نرخ. "
                            "انتخاب نظام مقطوع یا دفاتر و اظهارنامه نهایی با مشاور رسمی مالیاتی بررسی شود.", last_col)
auto_fit_columns(ws, min_width=9, max_width=24, header_row=4, data_start_row=5)
ws.column_dimensions["B"].width = 22
for col in "DEFGHJ":
    ws.column_dimensions[col].width = 19
ws.column_dimensions["L"].width = 26
auto_fit_row_heights(ws, header_row=4, data_start_row=5)

# ============================================================
# شیت ۷: صورت وضعیت ها
# ============================================================
ws = wb.create_sheet(SH_INV)
rtl(ws)
headers = ["پروژه", "شماره", "مبلغ کارکرد (ریال)", "تاریخ ارائه (شمسی)", "تاریخ تصویب (شمسی)",
           "تأخیر تصویب (روز)", "تاریخ پرداخت (شمسی)", "تأخیر پرداخت (روز)", "مبلغ دریافتی (ریال)", "یادداشت"]
last_col = len(headers) + 1  # 11
setup_sheet(ws, title="پیگیری صورت وضعیت‌ها — تصویب، پرداخت و تأخیرها", last_col=last_col)
write_row(ws, 4, headers)
style_header_row(ws, 4, 2, last_col)
inv_start, inv_end = 5, 14
for r in range(inv_start, inv_end + 1):
    write_row(ws, r, ["", "", "", "", "", "", "", "", "", ""])
    style_data_row(ws, r, 2, last_col, r - inv_start)
    for col in (2, 3):
        set_align(ws, r, col, "text")
    for col in (4, 7, 9, 10):
        set_align(ws, r, col, "number")
        ws.cell(row=r, column=col).number_format = RIAL if col in (4, 10) else "0"
    for col in (5, 6, 8):
        set_align(ws, r, col, "date")
inv_total = inv_end + 1
write_row(ws, inv_total, ["جمع", "", f"=SUM(D{inv_start}:D{inv_end})", "", "", "", "", "",
                          f"=SUM(J{inv_start}:J{inv_end})",
                          f'=IF(D{inv_total}="","مانده وصول: "&TEXT(D{inv_total}-J{inv_total},"#,##0")&" ریال","")'])
style_total_row(ws, inv_total, 2, last_col)
ws.cell(row=inv_total, column=4).number_format = RIAL
ws.cell(row=inv_total, column=10).number_format = RIAL
ws.conditional_formatting.add(f"G{inv_start}:G{inv_end}", CellIsRule(operator="greaterThan", formula=["30"],
    fill=base.CF_WARNING_FILL, font=base.CF_WARNING_FONT))
ws.conditional_formatting.add(f"G{inv_start}:G{inv_end}", CellIsRule(operator="greaterThan", formula=["90"],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
ws.conditional_formatting.add(f"I{inv_start}:I{inv_end}", CellIsRule(operator="greaterThan", formula=["20"],
    fill=base.CF_WARNING_FILL, font=base.CF_WARNING_FONT))
ws.conditional_formatting.add(f"I{inv_start}:I{inv_end}", CellIsRule(operator="greaterThan", formula=["60"],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
caption(ws, inv_total + 2, "تاریخ‌ها را شمسی وارد کنید؛ چون اکسل روی تاریخ شمسی محاسبه ندارد، ستون‌های «تأخیر» را دستی بر حسب روز پر کنید "
                            "(کهربایی: بیش از ۳۰ روز تأخیر تصویب / بیش از ۲۰ روز تأخیر پرداخت — قرمز: بیش از ۹۰ و ۶۰ روز). "
                            "عدم تصویب در مهلت، قابل طرح در مرجع حل اختلاف است (ماده ۳۵ شپا).", last_col)
ws.freeze_panes = "C5"
auto_fit_columns(ws, min_width=9, max_width=26, header_row=4, data_start_row=5)
ws.column_dimensions["D"].width = 19
ws.column_dimensions["J"].width = 19
ws.column_dimensions["K"].width = 28
auto_fit_row_heights(ws, header_row=4, data_start_row=5)

# ============================================================
# شیت ۸: کنترل (Review)
# ============================================================
ws = wb.create_sheet(SH_REV)
rtl(ws)
ws.sheet_properties.tabColor = "FFC000"
headers = ["شرح بررسی", "مقدار مورد انتظار", "مقدار ثبت‌شده", "وضعیت"]
last_col = len(headers) + 1  # 5
setup_sheet(ws, title="کنترل صحت فرمول‌ها (خودکار)", last_col=last_col)
write_row(ws, 4, headers)
style_header_row(ws, 4, 2, last_col)
checks = [
    ("ظرفیت مصرفی راه و ترابری",
     f"=SUMPRODUCT(('{SH_CAP}'!D{cap_start}:D{cap_end}=\"راه و ترابری\")*('{SH_CAP}'!F{cap_start}:F{cap_end}=\"در دست اجرا\")*'{SH_CAP}'!E{cap_start}:E{cap_end})",
     f"='{SH_CAP}'!C35"),
    ("ظرفیت مصرفی ابنیه و ساختمان",
     f"=SUMPRODUCT(('{SH_CAP}'!D{cap_start}:D{cap_end}=\"ابنیه و ساختمان\")*('{SH_CAP}'!F{cap_start}:F{cap_end}=\"در دست اجرا\")*'{SH_CAP}'!E{cap_start}:E{cap_end})",
     f"='{SH_CAP}'!D35"),
    ("تعداد کارهای در دست اجرا",
     f"=SUMPRODUCT(('{SH_CAP}'!F{cap_start}:F{cap_end}=\"در دست اجرا\")*1)",
     f"='{SH_CAP}'!C37"),
    ("جمع مبلغ قراردادهای شیت مالیات",
     f"=SUM('{SH_TAX}'!D{tax_start}:D{tax_end})",
     f"='{SH_TAX}'!D{tax_total}"),
    ("جمع کارکرد صورت وضعیت‌ها",
     f"=SUM('{SH_INV}'!D{inv_start}:D{inv_end})",
     f"='{SH_INV}'!D{inv_total}"),
]
rev_start = 5
for i, (label, exp, act) in enumerate(checks):
    r = rev_start + i
    write_row(ws, r, [label, exp, act, f'=IF(ROUND(C{r},2)=ROUND(D{r},2),"✓ تأیید","✗ مغایرت")'])
    style_data_row(ws, r, 2, last_col, i)
    set_align(ws, r, 2, "text"); set_align(ws, r, 3, "number"); set_align(ws, r, 4, "number")
    set_align(ws, r, 5, "number")
    ws.cell(row=r, column=3).number_format = RIAL
    ws.cell(row=r, column=4).number_format = RIAL
rev_end = rev_start + len(checks) - 1
ws.conditional_formatting.add(f"E{rev_start}:E{rev_end}", CellIsRule(operator="equal", formula=['"✓ تأیید"'],
    fill=base.CF_POSITIVE_FILL, font=base.CF_POSITIVE_FONT))
ws.conditional_formatting.add(f"E{rev_start}:E{rev_end}", CellIsRule(operator="equal", formula=['"✗ مغایرت"'],
    fill=base.CF_NEGATIVE_FILL, font=base.CF_NEGATIVE_FONT))
caption(ws, rev_end + 2, "این شیت با هر ورودی جدید به‌صورت خودکار به‌روز می‌شود؛ اگر ردیفی «مغایرت» نشان داد، اطلاعات را بررسی کنید.", last_col)
auto_fit_columns(ws, min_width=12, max_width=36, header_row=4, data_start_row=5)
ws.column_dimensions["B"].width = 34
auto_fit_row_heights(ws, header_row=4, data_start_row=5)

wb.properties.creator = "Z.ai"
wb.save(OUT)
print("SAVED:", OUT)
