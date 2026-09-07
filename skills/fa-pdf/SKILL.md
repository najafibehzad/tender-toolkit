---
name: fa-pdf
description: ساخت سریع PDF فارسی/راست‌به‌چپ (گزارش، چک‌لیست، فاکتور، بروشور، قرارداد) روی همین سیستم، با Chrome سیستم و فونت وزیرمتن. Use whenever the user asks for a PDF of Persian content (فارسی، چک‌لیست، گزارش، فاکتور، بروشور، صورت‌جلسه) or any RTL document — even if they just say "فایل pdf بده" / "به صورت pdf ذخیره کن" for Persian content. Bypasses the document-skills pdf skill's Python pipelines, which CANNOT run on this machine (no Python installed).
---

# ساخت سریع PDF فارسی (مسیر آماده این سیستم)

## محیط این ماشین (قبلاً بررسی شده — دوباره کاوش نکن!)

- **Python نصب نیست.** اسکریپت‌های Pythonِ skill رسمی pdf (`env.check`, `pdf_qa.py`, `poster_validate.py`, `design_engine.py`, `cover_render.py`) کار نمی‌کنند — فراخوانی نکن.
- **Node v22 هست.** رندر با `playwright-core` + **Chrome سیستم** در `C:\Program Files\Google\Chrome\Application\chrome.exe` انجام می‌شود — بدون دانلود Chromium (~150-300MB صرفه‌جویی می‌شود).
- **محیط کش‌شده و آماده:** `C:\Users\behzad\.zcode\workspace\default\pdf-build\`
  - `node_modules\` — playwright-core، pdf-lib، vazirmatn (نصب‌شده؛ اگر پوشه هست `npm install` نزن)
  - `fonts\` — وزیرمتن woff2 پنج وزن (Regular/Medium/SemiBold/Bold/ExtraBold)
  - `render.js` — اسکریپت رندر عمومی: `node render.js <input.html> <output.pdf>`
  - `checklist.html` — **طرح پایه** برای اسناد A4 فارسی (چیدمان، پالت، کامپوننت‌ها)

## مسیر سریع (هدف: زیر ~۱ دقیقه تا PDF)

1. `cd C:\Users\behzad\.zcode\workspace\default\pdf-build`
2. `checklist.html` را کپی کن (مثلاً `report.html`) و **فقط محتوا را عوض کن** — CSS، `@font-face`، اسکلت `.page` و پالت را نگه دار.
3. رندر: `node render.js report.html report.pdf` — خروجی: PDF وکتور + متادیتا + PNG دوبعدِ هر صفحه در `pages-report\` + گزارش سرریز `OVERFLOW-DIAG`.
4. کنترل بصری: PNGهای تولیدشده را به یک agent `judge` بده (یک dispatch برای کل سند) و بر اساس حکم‌ها اصلاح کن.
5. PDF نهایی را به ریشه workspace کپی کن و کنار آن، فایل HTML منبع را هم تحویل بده (قانون skill pdf: هرگز بدون HTML تحویل نده).

اگر `node_modules` یا `fonts` حذف شده بود: `npm install playwright-core pdf-lib vazirmatn` و کپی وزن‌های فونت از `node_modules/vazirmatn/fonts/webfonts/*.woff2`.

## قواعد طراحی که در طرح پایه رعایت شده (حفظ کن)

- `<html lang="fa" dir="rtl">` و `font-family: 'Vazirmatn', 'Tahoma', sans-serif` (همیشه fallback generic بگذار).
- اسناد A4 چندصفحه‌ای: `.page { width:210mm; height:297mm; page-break-after:always; display:flex; flex-direction:column }` + `@page { size:A4; margin:0 }` + `html,body { margin:0; background:#fff }` (پس‌زمینه body = پس‌زمینه صفحه‌ها).
- پدینگ داخلی هر صفحه ~`11mm 13mm 9mm`؛ سربرگ جاری و پانوشت شماره صفحه داخل خود `.page` (نه با header/footer template کروم).
- پالت تک‌خانواده ≤۵ رنگ: teal `#0f766e` + تینت‌های کم‌اشباع `#eef8f4`/`#c4e6da` + متن slate؛ رنگ هشدار آمبر فقط برای جعبه ریسک. رنگ اشباع فقط برای خطوط/بج کوچک.
- آیتم‌های چک‌لیست: مربع تیک `border:1.5px solid var(--teal); border-radius` + چیپ مهلت با `white-space:nowrap` + `break-inside:avoid` روی هر آیتم؛ جدول‌ها `width:100%` با سربرگ تینت و zebra.
- متن معتبر: بدون اموجی تزئینی، بدون واترمارک/«تولیدشده توسط AI»، متادیتا فقط محتوایی.

## تله‌های رایج (همه یک‌بار چشم‌خورده‌اند)

- `waitUntil:'networkidle'` + `await page.evaluate(() => document.fonts.ready)` **قبل از** `page.pdf()` — وگرنه فونت بارگذاری نشده و حروف فارسی با فونت جایگزین می‌افتد.
- `preferCSSPageSize: true` + `margin: 0` در گزینه‌های pdf — وگرنه مارجین پیش‌فرض کروم حاشیه سفید می‌اندازد.
- فونت‌ها را با **مسیر نسبی** (`fonts/Vazirmatn-Regular.woff2`) صدازد کن و HTML را از همان پوشه باز کن (`file:///` با اسلش رو به جلو).
- `overflow:hidden` روی `html/body/.page` نگذار (محتوا بی‌صدا بریده می‌شود)؛ سرریز را با `OVERFLOW-DIAG` و judge بگیر.
- دیاگرام/اسکرین‌شات هرگز مبنای PDF نهایی نباشد — فقط `page.pdf()` (وکتور). PNGها فقط برای بازبینی judge هستند.
- برای پوستر تک‌صفحه‌ای با ارتفاع آزاد: همان مسیر ولی `.page` با `min-height` و ارتفاع خودکار، یا یک `.page` بلند؛ رندر یکسان است.

## زمان‌بندی انتظاری

| مرحله | زمان |
|---|---|
| کپی طرح + نوشتن محتوا | اکثر زمان — بسته به سند |
| `node render.js` | ~۵-۱۰ ثانیه |
| judge روی PNGها | ~۱-۲ دقیقه (فقط برای اسناد نهایی/پرهزینه؛ برای پیش‌نویس می‌شود حذفش کرد) |
| نصب از صفر (فقط اگر محیط پاک شده) | ~۳۰-۴۰ ثانیه npm + کپی فونت |
