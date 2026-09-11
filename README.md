# بسته ابزارهای تدارکات و آنالیز پروژه

این ریپو شامل skillهای ساخته‌شده برای کار پیمانکاری عمرانی ایران است — از تدارکات و آگهی‌ها تا آنالیز قیمت، صورت وضعیت، تعدیل و مالیات.

## ۱. تدارکات (Procurement / Tenders)
- **`skills/iran-setadiran-tenders/`** — استخراج آگهی‌های مناقصه، استعلام و مزایده از سامانه ستادیران
- **`skills/fardis-tender-automation/`** — سیستم خودکار گزارش روزانه آگهی‌های تدارکات شهر فردیس (تسک زمان‌بند ویندوز + GitHub Pages + ارسال PDF به بله/تلگرام/جیمیل)

## ۲. آنالیز قیمت (Price Analysis)
- **`skills/iran-analiz-fehrest-maghadir/`** — آنالیز قیمت از روی برآورد (دفترچه فهرست مقادیر)
- **`skills/asphalt-metreh/`** — فرم ورود داده + داشبورد مدیریتی + چاپ «ریز متر روز» برای اکسل ریزمتره آسفالت

## ۳. گزارش مصالح (Material Takeoff)
- **`skills/iran-masaleh-takeoff/`** — گزارش مصالح مصرفی پروژه

## ۴. صورت وضعیت و صورتجلسه
- **`skills/iran-soorat-vaziat-tajmi/`** — صورت وضعیت تجمیعی از صورتجلسه + براورد (قاعده ستاره‌دار، تجمیع تجمعی، حمل مصالح، بسته ۵ فایلی)
- **`skills/iran-tadil-calculator/`** — محاسبه تعدیل صورت وضعیت (بخشنامه ۱۰۱/۱۷۳۰۷۳، شاخص‌ها، فرمول ۰/۹۵، تاخیر مجاز/غیرمجاز)

## ۵. مشاوره پیمان و مالیات
- **`skills/iran-piman-advisor/`** — مشاور امور پیمان: رتبه‌بندی، ظرفیت مجاز، ساجات، شرایط عمومی پیمان، تضامین
- **`skills/iran-tax-contracting/`** — مشاوره مالیاتی پیمانکاران (ماده ۱۰۹/۱۰۴، تکلیفی، ارزش افزوده)

## ۶. نقشه‌های اتوکد (CAD)
- **`skills/iran-dwg-toolkit/`** — تحلیل ماشینی DWG/DXF با accoreconsole (لایه/متره/متن بدون باز کردن اتوکد) + ژئورفرنس نقشه‌های مختصات‌محلی روی نقشهٔ واقعی: KML گوگل‌ارث و پیش‌نمایش وب چندپایه‌ای (نشان/ماهوارهٔ گوگل/مپ‌ایر — قابل استفاده از ایران)

## ۷. ابزارهای کمکی
- **`skills/fehrest-baha-1404/`** — فهرست‌بها ۱۴۰۴ + ضرایب
- **`skills/fa-pdf/`** — ساخت PDF فارسی RTL
- **`skills/fa-research-pdf/`** — تحقیق وب → PDF فارسی رتبه‌بندی‌شده (مبنای رضایت مشتری)
- **`skills/fa-letterhead/`** — ساخت سربرگ رسمی فارسی DOCX/PDF از روی سربرگ موجود یا از صفر
- **`skills/baha-abnieh-pwa/`** — ساخت PWA جستجوی آفلاین از فهرست بهای فارسی/اکسل

## ساختار
```
tender-toolkit/
├── skills/                    # ۱۵ skill پیمانکاری + کمکی
└── README.md                  # این فایل
```

## نصب (Kilo Code / ZCode)

### نصب به‌صورت سراسری
```powershell
$dst = "$env:USERPROFILE\.agents\skills"
Copy-Item -Recurse -Force skills\* $dst\
```

### یا فقط skillهای دلخواه
```powershell
$dst = "$env:USERPROFILE\.agents\skills"
foreach ($s in "iran-setadiran-tenders","fardis-tender-automation","iran-analiz-fehrest-maghadir","asphalt-metreh","iran-masaleh-takeoff","iran-soorat-vaziat-tajmi","iran-tadil-calculator","iran-piman-advisor","iran-tax-contracting","fehrest-baha-1404","fa-pdf","fa-research-pdf","fa-letterhead","baha-abnieh-pwa") {
  Copy-Item -Recurse -Force "skills\$s" "$dst\$s"
}
```

## استفاده

### مرحله ۱: دریافت آگهی‌ها
```
آگهی‌های شهر X را بگیر
```
→ skill تدارکات فعال می‌شود

### مرحله ۲: آنالیز قیمت
```
@c:/path/to/baravord.pdf آنالیز با ضریب پیشنهادی پیمانکار ۱.۵
```
→ skill آنالیز فعال می‌شود

### مرحله ۳: گزارش مصالح
گزارش مصالح خودکار بعد از آنالیز ساخته می‌شود.

## تاریخ ساخت
۱۴۰۵/۰۶/۱۶ (سپتامبر ۲۰۲۶) — بروزرسانی ۱۴۰۵/۰۶/۱۹: افزودن ۹ skill (تعدیل، صورت وضعیت تجمیعی، امور پیمان، مالیات، سربرگ، تحقیق PDF، PWA فهرست‌بها، ریزمتره آسفالت، اتوماسیون فردیس)
