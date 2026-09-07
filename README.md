# بسته ابزارهای تدارکات و آنالیز پروژه

این ریپو شامل سه skill اصلی برای کار پیمانکاری عمرانی است:

## ۱. تدارکات (Procurement / Tenders)
**`skills/iran-setadiran-tenders/`** - استخراج آگهی‌های مناقصه، استعلام و مزایده از سامانه ستادیران

## ۲. آنالیز قیمت (Price Analysis)
**`skills/iran-analiz-fehrest-maghadir/`** - آنالیز قیمت از روی برآورد (دفترچه فهرست مقادیر)

## ۳. گزارش مصالح (Material Takeoff)
**`skills/iran-masaleh-takeoff/`** - گزارش مصالح مصرفی پروژه

## مهارت‌های کمکی
- `skills/fehrest-baha-1404/` - فهرست‌بها ۱۴۰۴ + ضرایب
- `skills/fa-pdf/` - ساخت PDF فارسی RTL

## ساختار
```
tender-toolkit/
├── skills/                    # سه skill اصلی + کمکی
├── examples/                  # نمونه‌های اجرا شده
├── workspace/                 # فضای کاری (داده + خروجی)
└── README.md                  # این فایل
```

## استفاده در VS Code (Kilo Code)

### نصب skillها به‌صورت سراسری
```powershell
# Windows PowerShell
Copy-Item -Recurse -Force skills\iran-setadiran-tenders $env:USERPROFILE\.kilo\skills\
Copy-Item -Recurse -Force skills\iran-analiz-fehrest-maghadir $env:USERPROFILE\.kilo\skills\
Copy-Item -Recurse -Force skills\iran-masaleh-takeoff $env:USERPROFILE\.kilo\skills\
Copy-Item -Recurse -Force skills\fehrest-baha-1404 $env:USERPROFILE\.kilo\skills\
Copy-Item -Recurse -Force skills\fa-pdf $env:USERPROFILE\.kilo\skills\
```

### یا در پروژه (project scope)
```powershell
# در ریشه پروژه
Copy-Item -Recurse -Force skills\iran-setadiran-tenders .kilo\skills\
Copy-Item -Recurse -Force skills\iran-analiz-fehrest-maghadir .kilo\skills\
Copy-Item -Recurse -Force skills\iran-masaleh-takeoff .kilo\skills\
Copy-Item -Recurse -Force skills\fehrest-baha-1404 .kilo\skills\
Copy-Item -Recurse -Force skills\fa-pdf .kilo\skills\
```

## استفاده

### مرحله ۱: دریافت آگهی‌ها
در چت Kilo بگو:
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
۱۴۰۵/۰۶/۱۶ (سپتامبر ۲۰۲۶)
