// اندازه‌گیری ارتفاع اجزای measure.html (تولیدشده توسط gen_city_report.js)
// اجرا از همان پوشه کاری که gen_city_report.js اجرا شده.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const IN = path.join(process.cwd(), 'measure.html');
const OUT = path.join(process.cwd(), 'heights.json');
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 1300 } });
  const page = await ctx.newPage();
  await page.goto('file:///' + IN.replace(/\\/g, '/'), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const heights = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-m]').forEach(el => {
      out[el.getAttribute('data-m')] = Math.ceil(el.getBoundingClientRect().height);
    });
    return out;
  });
  fs.writeFileSync(OUT, JSON.stringify(heights), 'utf8');
  const keys = Object.keys(heights);
  console.log('MEASURED', keys.length, 'elements');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
