---
name: iran-setadiran-tenders
description: >-
  استخراج آگهی‌های مناقصه، استعلام و مزایده از سامانه تدارکات الکترونیکی دولت ایران (ستاد ایران / setadiran) برای یک استان و شهر مشخص، و ساخت گزارش PDF فارسی RTL با مشخصات کامل اگهی شامل رشته و رتبهٔ مورد نیاز پیمانکار. Use whenever the user mentions مناقصات، استعلامات، مزایده، آگهی‌های پیمانکاری، تدارکات دولتی، ستاد ایران، setadiran، etend، eproc، تابلوی اعلانات مرکزی, or asks for government tender/procurement announcements by province/city (استان/شهر) — even if they only paste a setadiran link and say «برام لیست کن».
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
6. **رشته و رتبهٔ مورد نیاز در کارت مناقصه (۲۰۲۶-۰۹-۱۱، به درخواست کاربر)**:
   - «رشته مورد نیاز» = فهرست «حوزه‌های فعالیت» خود اگهی که در صفحه HTML با گرید AJAX بارگذاری می‌شود — پس از JSON عمومی `etend/centralBoardTenderDetails-loadTenderDomainsList.action?tenderId={tableId}` بگیر (فیلد `parentName` مثل «رشته ابنیه»؛ پیشوند «رشته » برای نمایش حذف می‌شود؛ چندتایی = همه با «، «). در کارت به‌صورت چیپ آبی + ردیف kv نمایش داده می‌شود.
   - «رتبه/پایه مورد نیاز» فیلد جداگانه‌ای در سامانه ندارد (`levelNumber` همیشه null)؛ فقط وقتی درج می‌شود که در متن اگهی (عنوان/شرح/توضیح تضمین) ذکر شده باشد — استخراج با regex «(?:حداقل )?رتبه (بندی )?N( تا M)?» در `fetch_details.js` (تابع `extractGradeFromText`). نبودش یعنی اگهی رتبهٔ صریح ندارد؛ همین در کادر روش‌شناسی توضیح داده شده.
   - `heights.json` دارای مهر `__layout` است (gen تگ `<meta name="layout-v">` می‌نویسد، measure ذخیره می‌کند)؛ با هر تغییر چیدمان کارت‌ها `LAYOUT` را در gen بالا ببر تا ارتفاع‌های قدیمی بی‌اعتبار شوند و measure خودکار دوباره اجرا شود.

## گردش کار

### اجرای سریع (هر شهر، هر زمان) — یک دستور

موتور کامل (فچر + گزارش‌ساز + QA + رندر) در ریپوی `~/.zcode/workspace/default/fardis-tenders` یکپارچه شده. وقتی کاربر گفت «آگهی‌های شهر X را بگیر/به‌روز کن»، فقط این را اجرا کن:

```
node ~/.zcode/workspace/default/fardis-tenders/city_report.mjs "<شهر>"
```

- **استان لازم نیست** — از روی نام شهر خودش حل می‌شود (کش `setadiran-data/city-map.json` از فرزندان ۳۱ استان، اعتبار ۳۰ روز؛ اگر شهر در کش نبود خودش از نو می‌سازد). اگر شهر مبهم/هم‌نام بود، آرگومان دوم استان را بده: `city_report.mjs "<شهر>" "<استان>"`.
- همیشه **داده تازه** واکشی می‌شود (تابلو زنده است)؛ نشان «جدید» از مقایسه با اجرای قبل همان شهر می‌آید.
- خروجی: QA قطعی (`ALL PASS` لازم است) → PDF نام‌دار `گزارش آگهی‌های <شهر> <تاریخ شمسی>.pdf` روی `C:\Desktop` → خودکار باز می‌شود. `--no-open` برای باز نشدن.
- سرعت: فردیس ~۱۲ ثانیه؛ کرج (۶۰۰ آگهی، ۷۶ صفحه) ~۷۲ ثانیه. اندازه‌گیری ارتفاع فقط وقتی لازم می‌شود که ترکیب کارت‌های شهر عوض کرده باشد.
- این زنجیره push/notify نمی‌کند (اتوماسیون روزانه به‌خواست کاربر خاموش است) — فقط PDF محلی. اگر کاربر خواست منتشر/ارسال شود، طبق مهارت fardis-tender-automation عمل کن.
- اگر در ZCode هستی و می‌خواهی به‌جای PDF خلاصهٔ متنی بدهی، همان زنجیره است؛ خروجی میانی در `setadiran-data/<استان-شهر>/final_data.json` است.
- نام شهر/استان دقیقاً همان‌طور که کاربر گفته (فارسی) پاس بده؛ نرمال‌سازی نیم‌فاصله خودکار است.
- در پیام نهایی، جدول مناقصات را با شماره فراخوان کامل و مهلت‌ها بیاور تا کاربر بتواند با سایت تطبیق دهد؛ موارد جدید و مهلت‌گذشته را جدا اعلام کن.
- اگر کاربر «همه شهرهای استان» خواست: برای هر شهر جداگانه اجرا کن، یا `fetch_announcements.js "<استان>"` بدون شهر (selectedCities={provId}) را تست کن.
- فیلد نام در API شهرها `locName` است و ردیف‌های برگردانده‌شده خودشان استان‌اند (locType=92)؛ فرزندانشان فقط با `parentLocId={provId}` می‌آیند — فیلتر «والد تهی» جواب نمی‌دهد.

### زنجیرهٔ گام‌به‌گام (فقط برای اشکال‌زدایی یا تغییر قالب)

```
cd ~/.zcode/workspace/default/fardis-tenders
node fetch_announcements.js "<استان>" "<شهر>"   # فهرست تازه + prev + history
node fetch_details.js                          # جزئیات: مناقصه از etend، خدمت از eproc (۶ worker، retry خودکار)
node gen_city_report.js                        # اگر ارتفاع‌ها کهنه/ناقص باشند → measure mode
node measure.js                                # (فقط اگر بالا گفت MEASURE_FIRST) با CHROME_PATH
node gen_city_report.js                        # → report.html نهایی
node qa_report.js                              # QA قطعی — exit 1 یعنی منتشر نکن
node render.js                                 # → report.pdf (با CHROME_PATH)
```

نکته‌های فنی این زنجیره: ارتفاع کارت‌ها per-city در `setadiran-data/<شهر>/heights.json` ذخیره و قبل از استفاده اعتبارسنجی می‌شود (اجرای شهر دیگر فایلش را خراب نمی‌کند)؛ هر سه اسکریپت Playwright باید `CHROME_PATH` بگیرند.

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

- برد **مناقصه**: صفحه `centralBoardTenderDetails-execute.action?tenderId={tableId}` را بگیر. مقادیر در innerText خالی دیده می‌شوند چون داخل input هستند — **HTML خام را پارس کن**: ورودی‌های `name="tenderDto.*"` شامل شماره، عنوان، طبقه‌بندی (`subjectAllowedName`)، دستگاه، مسئول ثبت (`tenderRegistrarEmployeeFullName`)، کد پستی، برآورد مالی (`financialEstimatePrice`)، هزینه اسناد، حساب واریز (`tenderDocumentsPriceAccount.id`)، تضمین (`guarantyPrice`)، مهلت‌ها (`documentsDeadline*`، `proposalDeadline*`، `opening*`، `offersValid*`)، توضیحات، آدرس، استان/شهر عملیات (selectهای selected). جدول «حوزه های فعالیت» در HTML نیست و با AJAX از `loadTenderDomainsList` می‌آید (بالا را ببین).
- برد **خرید** (کالا/خدمات): صفحه eproc با `requestId={reqId}`. سربرگ‌ها بدون session خالی‌اند اما **شرح کلی نیاز، جدول اقلام (کد/نام/واحد/تعداد/تاریخ نیاز) و توضیحات خریدار رندر می‌شوند** — از متن HTML جدا شده با label «شرح کلي نياز» و ردیف‌های بعد از «رديف» پارس کن. نوع را از وجود «اطلاعات خدمات مورد نياز» (خدمت) یا «اطلاعات کالاهاي مورد نياز» (کالا) تشخیص بده.
- این مرحله را `scripts/fetch_details.js` انجام می‌دهد: `node scripts/fetch_details.js` → خروجی `setadiran-data/<پوشه-شهر>/final_data.json`.

### ۴) گزارش PDF فارسی

از مهارت `fa-pdf` (محیط آماده `pdf-build`) استفاده کن و `references/report-pipeline.md` را بخوان — شامل طرح صفحه‌ها، تله‌های سرریز، و صفحه‌بندی مبتنی بر اندازه‌گیری. مولد عمومی `assets/report/gen_city_report.js` برای هر شهری کار می‌کند (نام شهر/استان و تاریخ شمسی لحظه‌ای را خودکار از داده می‌سازد، بخش‌ها را «جدیدترین در بالا» با لنگر شماره فراخوان مرتب می‌کند، مهلت‌های گذشته را قرمز می‌کند، ستون زمان اعلام را از history می‌گذارد و نشان «جدید» می‌زند)؛ نسخه اجراشده نمونه برای فردیس: `pdf-build/gen_report.js` در جلسه ساخت گزارش اول.

### ۵) تحویل به کاربر

- **قاعدهٔ ایستاده (۲۰۲۶-۰۹-۱۱، به‌خواست کاربر): بعد از ساخته شدن PDF هیچ خلاصهٔ جدولی در چت لازم نیست.** زنجیره را تا انتها ببر (QA → PDF روی دسکتاپ → باز شدن خودکار) و در چت فقط چند خط کوتاه بگو: «گزارش <شهر> آماده شد — N مناقصه + M خدمت، K مورد مهلت گذشته» + مسیر PDF. جدول‌ها و جزئیات در PDF هستند؛ دادهٔ نهایی را برای خلاصهٔ متنی جداگانه استخراج نکن.

## تله‌های ثابت‌شده

- همه صفحات etend/eproc عمومی‌اند به‌جز همان صفحات ورود؛ هر 302 به `/oauth2/authorization/portal` یعنی مسیر اشتباهی رفته‌ای.
- `page .action` های قدیمی (مثل `searchAnnouncePage.action`) همگی پشت لاگین‌اند — وقتت را با آن‌ها تلف نکن.
- اعداد قیمت‌ها در etend با کاما هستند («134,157,651,532»)؛ گاهی بدون کاما («6707882577») — نرمال‌سازی کن.
- رشته‌های تاریخ به شکل `1405/06/31 - 13:00` (شمسی) می‌آیند.
- نیم‌فاصله/فاصله در نام استان‌ها و شهرها متغیر است؛ قبل از مقایسه نرمال کن.

## گزارش‌گیری صادقانه

تاریخ تهیه و فیلتر اعمال‌شده را در گزارش بنویس؛ اگر بخشی از داده (مثل برآورد مالی مزایده‌ها) عمومی نبود، «نیازمند ورود به سامانه» بنویس نه «—».
