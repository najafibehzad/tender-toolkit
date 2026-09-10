---
name: fardis-tender-automation
description: >-
  سیستم خودکار گزارش روزانه آگهی‌های تدارکات (ستادیران) شهر فردیس — تسک زمان‌بند
  ویندوز، ریپو GitHub، انتشار در GitHub Pages و ارسال خودکار PDF به بله، تلگرام و جیمیل.
  Use whenever the user mentions گزارش روزانه فردیس، تدارکات فردیس، آگهی فردیس،
  fardis-tenders، اعلان/گزارش بله یا تلگرام یا ایمیلِ گزارش، تسک زمان‌بندی گزارش،
  یا می‌خواهد اجرای دستی/اشکال‌زدایی/تغییر شهر یا ساعت/کانال اطلاع‌رسانی این سیستم را انجام دهد.
---

# سیستم خودکار گزارش روزانه فردیس (ستادیران)

راه‌اندازی‌شده ۲۰۲۶-۰۹-۰۵. هر روز ساعت ۱۵:۰۰ ایران: واکشی داده از ستادیران ← ساخت گزارش
(همه قواعد ثابت کاربر) ← کنترل کیفی ← رندر PDF ← پوش به GitHub ← انتشار Pages ← ارسال
PDF به سه کانال بله / تلگرام / جیمیل. **ستادیران همه IPهای خارجی را بلاک می‌کند** — واکشی
فقط از داخل ایران (لپ‌تاپ) ممکن است؛ اجرای ابری GitHub فقط «انتشار» می‌کند نه واکشی.

## نقشه مسیرها (همه ثابت‌اند)

| چی | کجا |
|---|---|
| ریپوی پروژه | `C:\Users\behzad\.zcode\workspace\default\fardis-tenders` (= GitHub `najafibehzad/fardis-tenders` عمومی) |
| گزارش آنلاین | https://najafibehzad.github.io/fardis-tenders/ (+ `/report.pdf`) |
| زنجیره روزانه | Task Scheduler تسک `FardisTenderDaily` (۱۵:۰۰، StartWhenAvailable=جبران پس از بوت، امن روی باتری) → `daily_run.cmd` → `daily_chain.sh` |
| پایپ‌لاین | `run_pipeline.mjs`: fetch_announcements → fetch_details → gen_city_report → measure → gen_city_report → qa_report → render.js |
| لاگ روزانه | `fardis-tenders\task-run.log` |
| تنظیمات کانال‌ها (اسرار) | `fardis-tenders\notify.local.json` — گیت‌آگنورده، **هرگز کامیت نشود** (ریپو عمومی است) |
| توکن GitHub پوش | `~/.zcode/fardis-ghtoken` (device-flow، کاربر najafibehzad) |
| قواعد ثابت گزارش | در `gen_city_report.js` و مهارت [[iran-setadiran-tenders]] — قرمزِ مهلت‌گذشته، ستون زمان اعلام، جدیدترین در بالا، لینک فعال، بدون مزایده/کالا — **برنگرد** |
| بات دوطرفهٔ بله | `bale_bot.mjs` + `bale_bot.cmd` + تسک `FardisBaleBot` (هر ۱ دقیقه) — لاگ `bale-bot.log` |
| بات ابری (لپ‌تاپ خاموش) | `cloud_bot.mjs` + ورک‌فلو `bale-cloud.yml` (Actions هر ۵ دقیقه، کانال تلگرام) + صف `pending-commands.json` |

## عملیات رایج

**اجرای دستی فوری:**
```bash
cd C:/Users/behzad/.zcode/workspace/default/fardis-tenders
CHROME_PATH='C:\Program Files\Google\Chrome\Application\chrome.exe' node run_pipeline.mjs
bash scheduled_push.sh && node notify_send.mjs
# یا: MSYS_NO_PATHCONV=1 schtasks /run /tn FardisTenderDaily
```

**اشکال‌زدایی:** اول `task-run.log` (انتهای فایل). الگوی سالم: `QA SUMMARY: ALL PASS` ← `PUSH-OK` ← `NOTIFY telegram=OK bale=OK smtp=OK`.

**پوش شکست خورد (PUSH-FAILED / 401):** توکن GitHub منقضی/ابطال شده:
`node ~/.zcode/gh_device_auth.mjs` پس‌زمینه → کد ۸رقمی را به کاربر بده → کاربر در
github.com/login/device وارد کند → صبر تا TOKEN_OK → دوباره push.

**کانال اطلاع‌رسانی جدید/جایگزین:** ربات را از @BotFather (داخل بله یا تلگرام) بسازد،
توکن را بگیرد، سپس:
```bash
node notify_send.mjs --setup bale --token <TOKEN>     # یا telegram
# کاربر /start بدهد → CHAT-FOUND id=… → ذخیره chatId در notify.local.json → node notify_send.mjs
```
ایمیل: کلید `smtp` در notify.local.json = `{host, port, secure, user, pass, to}`؛ جیمیل =
smtp.gmail.com:465 secure=true با App Password (نیازمند 2FA).
**تلگرام حتماً کلید `"proxy":"http://127.0.0.1:10809"` در بخش خودش داشته باشد** (v2rayN
کاربر) — بدنه multipart دستی در notify_send.mjs است چون npm-undici با FormData سراسری کار نمی‌کند.

**بات دوطرفهٔ بله (از ۲۰۲۶-۰۹-۰۶):** تسک `FardisBaleBot` هر ۱ دقیقه `bale_bot.cmd` → `bale_bot.mjs` را اجرا می‌کند: getUpdates با offset در
`bale-bot-state.json`، فقط به چتِ `bale.chatId` از notify.local.json (و چت‌های `bale-bot-allow.json`) جواب می‌دهد. دستورها: «گزارش» (پایپ‌لاین +
پوش + ارسال PDF در چت؛ قفل ۲۰ دقیقه‌ای + چکِ Running بودن تسک روزانه)، «وضعیت»، «لینک»، «تست»، «راهنما». اجرای دستی: `node bale_bot.mjs`
(یک دور poll)، `--send "متن"` (پیام به مالک)، `--selftest`. تله‌ها: لاگ فقط از stdout می‌رود (ریدایرکت `>>` خود cmd) — appendFileSync مستقیم وقتی
cmd فایل لاگ را باز نگه داشته بی‌صدا شکست می‌خورد؛ env پایپ‌لاین باید CHROME_PATH داشته باشد وگرنه measure.js با خطای Playwright می‌میرد.

**بات ابری برای وقتی لپ‌تاپ خاموش است (از ۲۰۲۶-۰۹-۰۶):** بله به سرورهای خارجی حتی روی API بات 403 می‌دهد (پروب GitHub Actions ۲۰۲۶-۰۹-۰۶)؛ پس
کانال ابری **تلگرام** است. ورک‌فلو `bale-cloud.yml` هر ~۴.۵ دقیقه `cloud_bot.mjs` را اجرا می‌کند: getUpdates ربات تلگرام، جوابِ سبک‌ها (راهنما/تست/لینک/وضعیت)
همان‌جا، بقیه (گزارش) در `pending-commands.json` ریپو صف می‌شود. بات لپ‌تاپ هر دقیقه علاوه بر پول بله: ① PATCH متغیر ریپو `LAPTOP_ALIVE`
(قلب تپنده) ② تخلیهٔ صف: GET contents → اجرای هر کار با همان هندلر (جواب در بله) → PUT حذف انجام‌شده‌ها (تعارض sha = retry). offset کلاود در
`bale-cloud-state.json` ریپو. توکن تلگرام در Actions Secret `TGTOKEN` (بدون gh CLI، با `~/.zcode/ghsecret-tool/set_secret.mjs TGTOKEN` — tweetnacl+blakejs
sealed-box). تست ابری: dispatch ورک‌فلو + خواندن لاگ run.
**دو تلهٔ حل‌شدهٔ این ورک‌فلو:** ① گیت‌هاب برای اجراهای `schedule` پیام HEAD کامیت را چک می‌کند — اگر `[skip ci]` داشته باشد cron **هرگز** نمی‌آید
(هیچ‌وقت تگ skip در کامیت‌های این ریپو نگذار)؛ ② زنجیرهٔ خودکار (گام آخر ورک‌فلو: sleep 240 + dispatch خود ورک‌فلو) برای GITHUB_TOKEN
`actions: write` می‌خواهد وگرنه 403 می‌دهد. زنجیره با `if: always()` ادامه می‌یابد؛ اگر dispatch خودش شکست بخورد زنجیره می‌میرد و cron پشتیبان است.
توقف بات ابری: disable کردن ورک‌فلو در تب Actions.

**تغییر شهر/استان:** آرگومان‌های `fetch_announcements.js` در `run_pipeline.mjs`
(مثلاً «البرز» «کرج»). پوشه داده جدید خودش در setadiran-data ساخته می‌شود و تاریخچه تازه شروع می‌شود.
**تغییر ساعت:** XML تسک (`task-fardis.xml`) + `schtasks /create /tn FardisTenderDaily /xml … /f`
(در Git Bash حتماً با `MSYS_NO_PATHCONV=1`). کرون UTC نیست — ساعت ویندوز محلی است.

## تله‌های ثابت‌شده

- جلد گزارش با تعداد مناقصه زیاد سرریز می‌شود → جدول خلاصه جلد با `COVER_TENDER_CAP=8` محدود است؛ QA (`qa_report.js`) سرریز را می‌گیرد و exit 1 می‌دهد → workflow منتشر نمی‌کند. اگر QA FAIL داد اول OVERFLOW-DIAG را ببین.
- `pageSize` API ستادیران حداکثر ۱۰؛ بزرگ‌تر نگذار.
- telegram=FAIL در لاگ یعنی v2rayN روشن نبوده — بله/ایمیل/Pages مستقل‌اند و می‌رسند.
- کاربر ترجیح می‌دهد تحویل سریع باشد: QA قطعی ~۱۵ ثانیه کافی است؛ بازبینی بصری LLM فقط اگر قالب عوض شود یا QA FAIL کند.
- دسترسی خارجی به gw/etend/eproc.setadiran.ir از هر IP غیرایرانی قطع است (تست قطعی ۲۰۲۶-۰۹-۰۵) — پیشنهاد انتقال واکشی به کلاد نده.
