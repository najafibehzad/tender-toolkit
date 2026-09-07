---
name: iran-setadiran-tenders
description: >-
  استخراج آگهی‌های مناقصه، استعلام و مزایده از سامانه تدارکات الکترونیکی دولت ایران (ستاد ایران / setadiran) برای یک استان و شهر مشخص، و ساخت گزارش PDF فارسی RTL با مشخصات کامل اگهی. Use whenever the user mentions مناقصات، استعلامات، مزایده، آگهی‌های پیمانکاری، تدارکات دولتی، ستاد ایران، setadiran، etend، eproc، تابلوی اعلانات مرکزی، or asks for government tender/procurement announcements by province/city (استان/شهر) — even if they only paste a setadiran link and say «برام لیست کن».
---

# آگهی‌های تدارکات دولتی ایران (setadiran)

گردآوری آگهی‌های فعال سامانه ستاد ایران برای یک شهر، استخراج مشخصات کامل هر اگهی از صفحات رسمی، و تولید گزارش PDF فارسی.

## نقشه دسترسی (مهم‌ترین واقعیت)

لینک شناخته‌شده `https://etend.setadiran.ir/etend/indexPage.action` به ورود SSO قفل است. اما **همان آگهی‌ها بدون لاگین** از این سه نقطه عمومی در دسترس‌اند:

| منبع | آدرس | چه چیزی می‌دهد |
|---|---|---|
| تابلوی اعلانات مرکزی (UI) | `https://fe.setadiran.ir/centralboard` | لیست همه آگهی‌ها با فیلتر استان/شهر |
| API کارت‌ها (عمومی) | `https://gw.setadiran.ir/api/centralboard/cards/` | فهرست JSON آگهی‌ها |
| جزئیات مناقصه (عمومی) | `https://etend.setadiran.ir/etend/centralBoardTenderDetails-execute.action?tenderId={tableId}` | مشخصات کامل اگهی در فیلدهای input |
| جزئیات خرید/استعلام (عمومی) | `https://eproc.setadiran.ir/eproc/purchaseNeedViewBoardIntegration.do?method=showNeedDetailInfo&requestId={reqId}` | شرح کلی نیاز + جدول اقلام + توضیحات خریدار |

آگهی‌های برد «مزایده» (`reqId=null`) فقط داده کارت را دارند؛ جزئیاتشان در etend پشت لاگین است.

## قواعد ثابت گزارش (درخواست کاربر — همیشه اعمال شود)

1. **مهلت گذشته = قرمز**: اگهی‌هایی که مهلت دریافت اسناد (و برای استعلام/مزایده مهلت ارسال پاسخ)شان گذشته، با قرمز مشخص شوند — تاریخ قرمز + چیپ/برچسب «مهلت گذشته» + تینت ردیف. مقایسه با امروزِ شمسی (Intl fa-IR/en-US-u-ca-persian).
2. **ستون «زمان ارسال به صفحه اعلام»**: از `history.json` (اولین مشاهده پایش). برای اگهی‌های قدیمی‌تر از شروع پایش «—» بگذار و در کادر روش‌شناسی توضیح بده که زمان دقیق انتشار آن‌ها به‌صورت عمومی در دسترس نیست (فقط صفحه جستجوی لاگین‌شده etend آن را نشان می‌دهد).
3. **مرتب‌سازی «جدیدترین در بالا»**: ترتیب بازگشتی API با `sort=insertDate,desc` (= `orderIdx`) ملاک است و شماره فراخوان نزولی به‌عنوان لنگر دوم. تاریخ انتشار دقیق را در history نگه‌دار؛ اگر کاربر اسکرین‌شات با زمان‌های دقیق داد، همان را در history.json به‌عنوان firstSeen ثبت کن.
4. **لینک‌های فعال در HTML و PDF**: شماره هر اگهی کلیک‌پذیر باشد — مناقصه → `etend/centralBoardTenderDetails-execute.action?tenderId={tableId}`، خرید → `eproc/purchaseNeedViewBoardIntegration.do?method=showNeedDetailInfo&requestId={reqId}`، مزایده → صفحه عمومی ندارد؛ لینک به `etend/indexPage.action` (پس از لاگین، جستجو با شماره) + توضیح در کادر روش‌شناسی. در جلد نوار «پرش سریع» با لنگرهای `#sec-b1..b4` روی h2 بخش‌ها. استایل: `.nlink { color:inherit; text-decoration:none }` — ارتفاع کارت‌ها تغییر نمی‌کند، heights قابل استفاده مجدد است.
5. **فقط مناقصات + خدمات پیمانکاری (به درخواست کاربر)**: مزایده‌ها و استعلام‌های خرید کالا از گزارش حذف شده‌اند و در fetch_details هم جزئیات کالا (needType=1431) گرفته نمی‌شود. گزارش دو بخش دارد؛ کادر روش‌شناسی حذف این بخش‌ها را توضیح می‌دهد. اگر کاربر بعداً مزایده/کالا خواست، این قاعده را برگردان.

## گردش کار

### اجرای سریع (هر شهر، هر زمان)

وقتی کاربر گفت «آگهی‌های شهر X را بگیر/به‌روز کن»، همیشه **داده تازه بگیر** (تابلو زنده است و طی روز تغییر می‌کند) و این زنجیره را از پوشه کاری پروژه اجرا کن:

```
# ۱) فهرست تازه (prev_items.json خودکار از اجرای قبل ذخیره می‌شود → نشان «جدید»)
node ~/.agents/skills/iran-setadiran-tenders/scripts/fetch_announcements.js "استان" "شهر"
# ۲) جزئیات کامل (پوشه شهر از LAST.txt خوانده می‌شود)
node ~/.agents/skills/iran-setadiran-tenders/scripts/fetch_details.js
# ۳) گزارش: از پوشه pdf-build (محیط مهارت fa-pdf) — اسکلت عمومی از assets/report
cd <workspace>/pdf-build
rm -rf setadiran-data heights.json measure.html && cp -r ../setadiran-data .   # مولد داده را از cwd می‌خواند
node ~/.agents/skills/iran-setadiran-tenders/assets/report/gen_city_report.js   # → measure.html می‌سازد
node ~/.agents/skills/iran-setadiran-tenders/assets/report/measure.js           # → heights.json
node ~/.agents/skills/iran-setadiran-tenders/assets/report/gen_city_report.js   # → report.html
# ۴) کنترل کیفی قطعی (~۱۵ ثانیه) — به‌جای بازبینی کامل LLM
node ~/.agents/skills/iran-setadiran-tenders/assets/report/qa_report.js    # سرریز/صفحه خالی/حضور و ترتیب تک‌تک اگهی‌ها/پانوشت‌ها/قرمزها/بج‌ها/سربرگ تکرارشونده
# ۵) رندر و تحویل
node render.js report.html report.pdf
# ۶) بازبینی بصری LLM فقط در این حالت‌ها (وگرنه QA کافی است):
#    الف) تغییر قالب/CSS نسبت به اجرای قبلی  ب) FAIL شدن qa  ج) بار اول استفاده از قالب جدید
#    در حالت نمونه‌ای فقط صفحه ۱ (جلد) + یک صفحه جدولی را به judge بده (پرامپت کوتاه).
# ۷) کپی PDF و HTML به ریشه workspace و خلاصه متنی با جدول مناقصات (شماره فراخوان کامل)
```

- نام شهر/استان دقیقاً همان‌طور که کاربر گفته (فارسی) پاس بده؛ اسکریپت خودش با نرمال‌سازی نیم‌فاصله تطبیق می‌دهد.
- «جدید» فقط وقتی معنا دارد که prev_items.json از اجرای قبلی همان شهر موجود باشد؛ در گزارش و پیام نهایی تعداد موارد جدید را اعلام کن.
- در پیام نهایی، جدول مناقصات را با شماره فراخوان کامل بیاور تا کاربر بتواند با سایت تطبیق دهد.
- اگر کاربر «همه شهرهای استان» خواست: برای هر شهر حلقه بزن، یا `selectedCities={provId}` بدون شهر را تست کن.

### ۱) یافتن کد استان و شهر (`selectedCities`)

فیلتر جستجو با پارامتر `selectedCities={provLocId}-{cityLocId}` کار می‌کند. کدها را از API بگیر:

```
GET https://gw.setadiran.ir/api/centralboard/cards/setadCity?pageNumber=&pageSize=&sort=id,desc   (همه)
GET https://gw.setadiran.ir/api/centralboard/cards/setadCity?parentLocId={provId}                 (شهرهای یک استان)
```

مثال ثابت‌شده: البرز=`430`، فردیس=`444` → `selectedCities=430-444`.
برای «همه شهرهای یک استان» ابتدا `selectedCities={provId}` را تست کن؛ اگر جواب نداد، شهرها را جداگانه بگیر و ادغام کن. اگر تطبیق نام فارسی خودکار شکست (فاصله/نیم‌فاصله)، خروجی خام را چاپ کن و دستی تطبیق بده.

### ۲) فهرست آگهی‌ها

```
GET https://gw.setadiran.ir/api/centralboard/cards/?searchTypeCode=0&selectedCities=430-444&queryText=&pageNumber={N}&pageSize=10&sort=insertDate,desc
```

- **سقف pageSize=10 است** — بزرگ‌تر نگذار، تا `totalElements` صفحه‌بندی کن و با `number` dedupe کن.
- پاسخ: `{content, resultsExtraInfo, totalElements, totalPages}`.
- فیلدهای کلیدی کارت: `boardName` (خرید/مناقصه/مزایده)، `title`، `orgName`، `provinceName/cityName`، `number` (شماره معامله)، `jalaliSendDeadlineDate`، `jalaliDocumentDeadlineDate`، `basePrice`، `tableId`، `reqId`، `needType` (1431=کالا، 1432=خدمات).
- این مرحله را `scripts/fetch_announcements.js` انجام می‌دهد: `node scripts/fetch_announcements.js "البرز" "فردیس"` → خروجی `setadiran-data/البرز-فردیس/all_items.json` (+ `prev_items.json` و `LAST.txt`).

### ۳) جزئیات کامل هر اگهی

- برد **مناقصه**: صفحه `centralBoardTenderDetails-execute.action?tenderId={tableId}` را بگیر. مقادیر در innerText خالی دیده می‌شوند چون داخل input هستند — **HTML خام را پارس کن**: ورودی‌های `name="tenderDto.*"` شامل شماره، عنوان، طبقه‌بندی (`subjectAllowedName`)، دستگاه، مسئول ثبت (`tenderRegistrarEmployeeFullName`)، کد پستی، برآورد مالی (`financialEstimatePrice`)، هزینه اسناد، حساب واریز (`tenderDocumentsPriceAccount.id`)، تضمین (`guarantyPrice`)، مهلت‌ها (`documentsDeadline*`، `proposalDeadline*`، `opening*`، `offersValid*`)، توضیحات، آدرس، استان/شهر عملیات (selectهای selected)، و جدول «حوزه های فعالیت».
- برد **خرید** (کالا/خدمات): صفحه eproc با `requestId={reqId}`. سربرگ‌ها بدون session خالی‌اند اما **شرح کلی نیاز، جدول اقلام (کد/نام/واحد/تعداد/تاریخ نیاز) و توضیحات خریدار رندر می‌شوند** — از متن HTML جدا شده با label «شرح کلي نياز» و ردیف‌های بعد از «رديف» پارس کن. نوع را از وجود «اطلاعات خدمات مورد نياز» (خدمت) یا «اطلاعات کالاهاي مورد نياز» (کالا) تشخیص بده.
- این مرحله را `scripts/fetch_details.js` انجام می‌دهد: `node scripts/fetch_details.js` → خروجی `setadiran-data/<پوشه-شهر>/final_data.json`.

### ۴) گزارش PDF فارسی

از مهارت `fa-pdf` (محیط آماده `pdf-build`) استفاده کن و `references/report-pipeline.md` را بخوان — شامل طرح صفحه‌ها، تله‌های سرریز، و صفحه‌بندی مبتنی بر اندازه‌گیری. مولد عمومی `assets/report/gen_city_report.js` برای هر شهری کار می‌کند (نام شهر/استان و تاریخ شمسی لحظه‌ای را خودکار از داده می‌سازد، بخش‌ها را «جدیدترین در بالا» با لنگر شماره فراخوان مرتب می‌کند، مهلت‌های گذشته را قرمز می‌کند، ستون زمان اعلام را از history می‌گذارد و نشان «جدید» می‌زند)؛ نسخه اجراشده نمونه برای فردیس: `pdf-build/gen_report.js` در جلسه ساخت گزارش اول.

### ۵) گزارش متنی به کاربر

خلاصه شمارش به تفکیک برد + جدول خلاصه مناقصات + نکات برجسته (بزرگ‌ترین برآوردها) + یادآوری اینکه دانلود اسناد کامل در سامانه نیازمند لاگین است + تاریخ تهیه (شمسی و میلادی).

## تله‌های ثابت‌شده

- همه صفحات etend/eproc عمومی‌اند به‌جز همان صفحات ورود؛ هر 302 به `/oauth2/authorization/portal` یعنی مسیر اشتباهی رفته‌ای.
- `page .action` های قدیمی (مثل `searchAnnouncePage.action`) همگی پشت لاگین‌اند — وقتت را با آن‌ها تلف نکن.
- اعداد قیمت‌ها در etend با کاما هستند («134,157,651,532»)؛ گاهی بدون کاما («6707882577») — نرمال‌سازی کن.
- رشته‌های تاریخ به شکل `1405/06/31 - 13:00` (شمسی) می‌آیند.
- نیم‌فاصله/فاصله در نام استان‌ها و شهرها متغیر است؛ قبل از مقایسه نرمال کن.

## گزارش‌گیری صادقانه

تاریخ تهیه و فیلتر اعمال‌شده را در گزارش بنویس؛ اگر بخشی از داده (مثل برآورد مالی مزایده‌ها) عمومی نبود، «نیازمند ورود به سامانه» بنویس نه «—».
