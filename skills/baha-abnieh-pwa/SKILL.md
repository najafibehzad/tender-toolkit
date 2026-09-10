---
name: baha-abnieh-pwa
description: ساخت PWA جستجویی و آفلاین از «فهرست بهای ابنیه/راه/مکانیک/برق» یا هر فهرست قیمت فارسی/اکسل (Iranian construction price list) — با قابلیت جستجوی عددی آیتم، عنوان، کلمه دقیق، توضیحات فصل‌ها، و نصب آفلاین روی ویندوز و آیفون. Use whenever the user asks to build an app/PWA from a Persian price list (فهرست بها ابنیه/راه/مکانیک/برق، لیست قیمت، جدول بها) that needs search over item codes and titles, or says «PWA بساز از فهرست بها» / «اپ جستجوی فهرست قیمت» — even if they don't name the format. Produces a fully offline-capable package (no Python/Internet needed at runtime).
---

# PWA جستجویی از فهرست بهای فارسی / اکسل

## هدف
یک برنامهٔ PWA **آفلاین** می‌سازم که فهرست بهایی (مانند «فهرست بها ابنیه ۱۴۰۴» یا «فهرست بها راه ۱۴۰۴») را با جستجوی عددی آیتم، عنوان و کلمه دقیق، فیلتر فصل/واحد، **توضیحات فصل‌ها**، و نصب کامل روی ویندوز و آیفون ارائه کند. داده از اکسل/PDF استخراج و به JSON تعمیم می‌شود؛ خروجی بدون اینترنت اجرا می‌شود.

## محیط این ماشین (قبلاً بررسی شده)
- **Windows / PowerShell** (دستورهای shell باید با `;` جدا شوند؛ `&&` در این نسخه PowerShell کار نمی‌کند).
- **Python نصب نیست.** پی‌پای‌پلاین Excel را با **Node.js (v22 هست)** انجام بده.
- میز کار این کاربر: `C:\Desktop` و پروفایل `C:\Users\behzad`.
- Skill جستجوی وب محدود است (timeout می‌شود)؛ برای دانلود مستقیم فایل از سرور از اسکریپت Node `fetch`/`https` استفاده کن.

## مسیر کار (مرتب)

### ۱. پیدا کردن داده
- اول میز کار/پوشه را `Get-ChildItem` بکن و ببین فایل منبع کجاست.
- اگر کاربر لینک دانلود داد، صفحه را یک‌بار اسکریپت Node (`dl.js`) بکش و لینک مستقیم `.xlsx` را از HTML استخراج کن.
- **منابع جایگزین:** اگر atapars فایل نداشت، سایت `fehrestbaha.github.io` را امتحان کن (فهرست بهای راه/مکانیک/برق را دارد).
- **تله:** فایل‌های «ریزمتره» project-specific‌اند و بها ندارند — فهرست بهای واقعی جداگانه است.

### ۲. استخراج از اکسل (بدون کتابخانهٔ بیرونی)
اکسل = ZIP. روش:
1. `Copy-Item` به `.zip` و `Expand-Archive` کن.
2. از `xl/workbook.xml` نام شیت‌ها را بخوان؛ شیت قیمت را در `xl/worksheets/sheetN.xml` ببین.
3. متن‌ها در `xl/sharedStrings.xml` (آیتم‌های `<si><t>…</t></si>`).
4. در جل‌دها `<c r="B12" t="s"><v>idx</v></c>` — `t="s"` یعنی value شاخص sharedStrings؛ عددها `<v>` خام.
5. **عددهای فارسی/عربی را لاتین کن** (`[۰-۹]` و `[٠-٩]` → index). کد آیتم ۶ رقمی = `code = toLatin(ردیف فهرست).replace(/\s/g,'')`.

### ۳. تعمیم داده (اسکریپت `build-data.js`)
آیتم به‌شکل `{ r:ردیف, c:کد۶رقمی, t:عنوان, u:واحد, p:بها(ریال,null), ch:فصل }` بسازی و به `data.js` به‌شکل `const BAHA_DATA = {year, items, chapters, meta}` بنویس.
- **نرمالاسیون جستجو (`normalize()`):** لاتین‌کنی ارقام + عوض ی→ی، ك→ک، ة→ه، أ→ا، ؤ→و، ى→ی؛ حذف تشکیل (U+064B–U+0652، 0670) و کاف‌باها؛ ادغام space.
- بهاهای منفی (`-104500`) = ردیف «کسر بها» هستند (تخفیف)؛ نگه‌دار و با رنگ متفاوت نمایش بده. بها خالی = `null` → «در فهرست درج نشده».
- فصل = دو رقم اول کد. فصل‌های پراکنده (مثل ۴۱، ۹۹) هم یاد بگیر.
- **فصل‌ها:** هر فصل باید `code`، `title`، `desc` (توضیحات کامل فصل)، و `count` داشته باشد.

### ۴. ساخت PWA (پوشهٔ `BahaRah-PWA-1404/` یا `BahaAbnieh-PWA-1404/`)
فایل‌ها (همه نسبی — آفلاین کار می‌کند):
- `index.html` — `<html lang="fa" dir="rtl">`, appbar sticky, جعبه جستجو, دکمه‌های حالت (همه/عددی/عنوان/کلمه‌دقیق), دراپ‌دان فصل/واحد, grid کارت‌ها, modal جزئیات, `<div class="toast">`.
- `style.css` — RTL, پالت تک‌خانواده (آبی تیره + نارنجی accent), کارت‌ها با border-right رنگی, hover animations, responsive grid.
- `core.js` — منطق اصلی (normalize, search, render, state) — **جدا از app.js** چون editor سقف ۶۰۰۰ کاراکتر دارد.
- `app.js` — init و event listeners (لود می‌شود بعد از core.js).
- `data.js` — داده (ساختار: `const BAHA_DATA = {...};`).
- `manifest.webmanifest` + `sw.js` — فقط برای نصب واقعی PWA روی هاست HTTPS معنی دارند.
- `icons/icon-{192,512}.png` — تولید با اسکریپت Node خالص PNG encoder.

### منطق جستجو (قلب برنامه)
```js
normalize(s): // لاتین‌کنی ارقام + ی/ي→ی، ك/ك→ک، ة→ه، أ→ا + حذف تشکیل
searchItems(q):
  q = normalize(q)
  isExact = q.startsWith('«') && q.endsWith('»')
  filter: mode==='code' ? c.includes(q) : mode==='title' ? t.includes(q) : mode==='exact'||isExact ? t.includes(ph)||c.includes(ph) : c.includes(q)||t.includes(q)||u.includes(q)
  score: c===q?100 : c.startsWith(q)?80 : c.includes(q)?60 : t.startsWith(q)?40 : t.includes(q)?20
  sort by score desc then code asc
```

### ۵. آیکن (بدون dependencies)
با `gen-icons.js` (PNG encoder خالص: zlib.deflateSync + CRC32) آیکن بکش.

### ۶. نصب ویندوز
- `install-windows.cmd` (CRLF line endings): `copy` فایل‌ها به `%USERPROFILE%\Documents\BahaRah1404` و ساخت `.lnk` shortcut روی میز کار با VBScript.
- **تایید آفلاین:** `Get-Content index.html` را چک کن — هیچ `http://` نباشد؛ همهٔ refs نسبی باشند.

### ۷. نصب آیفون
**راه ۱ (توصیه‌شده): فایل تک‌صفحه‌ای**
- یک فایل `index.html` واحد بساز که همه چیز (HTML+CSS+JS+data) در آن باشد (inline `<style>`, inline `<script>`).
- فایل را با AirDrop/ایمیل/تلگرام به آیفون بفرست.
- در Safari باز کن → Share → Add to Home Screen.

**راه ۲: هاست رایگان**
- کل پوشه را یک‌بار در Netlify Drop/Vercel آپلود کن (رایگان) سپس Safari → Share → Add to Home Screen.

## تله‌های رایج (قبلاً چشم‌خورده)
- PowerShell `2>nul` و `&&` و inline Node (`node -e "..."`) همه شکسته‌اند — اسکریپت به فایل `.js` بنویس و `node script.js` اجرا کن.
- editor tool سقف ۶۰۰۰ کاراکتر دارد — فایل‌های بزرگ را چند تکه بنویس یا با Node `fs.writeFileSync` بساز.
- **`<div class="toast">` را در index.html بگذار** — المان toast الزامی است.
- clipboard در `file://` عمل نمی‌کند → `legacyCopy` با `textarea + document.execCommand('copy')` fallback.
- اعداد قیمت را با ارقام فارسی و جداکننده (`,`) نمایش بده؛ در توضیح بها به تومان هم (`round(ریال/10)`) بده.
- **split فایل‌ها:** برنامه را `core.js` (منطق) + `app.js` (init) تقسیم کن تا از سقف editor فرار کنی.

## اعتبارسنجی (پیش از تحویل)
سریع: `node --check app.js` و `node --check core.js`؛ بارگذاری `data.js`؛ ولید JSON منیفست؛ هدر PNG. سپس تست boot با DOM shim و جستجوهای نمونه: عددی `010101`→۱، پیشوند `2508`، عنوان `بتن`، کلمه دقیق `«تهیه و اجرای بتن»`، عدد ردیف. به محض امکان تست را از **نسخهٔ نصبشده** (`Documents\BahaRah1404`) اجرا کن.

## نمونه‌های موفق
- **فهرست بها ابنیه ۱۴۰۴:** ۱۵۶۵ آیتم، ۲۹ فصل، منبع: atapars.com
- **فهرست بها راه ۱۴۰۴:** ۸۹۲ آیتم، ۲۸ فصل، منبع: fehrestbaha.github.io
- **فهرست بها راه (فایل آیفون):** فایل تک‌صفحه‌ای HTML با همه داده‌های inline
