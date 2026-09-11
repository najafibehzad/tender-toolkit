// capture tile requests from neshan-test.html with headless Chrome
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  const seen = new Set();
  page.on('request', r => {
    const u = r.url();
    if (/neshan|tile/i.test(u) && !/ol\.js|ol\.css|leaflet/.test(u)) {
      const key = u.replace(/\d+/g, 'N');
      if (!seen.has(key)) { seen.add(key); console.log('REQ:', u.slice(0, 160)); }
    }
  });
  page.on('console', m => { if (/error/i.test(m.type())) console.log('CONSOLE:', m.text().slice(0,120)); });
  await page.goto('file:///C:/Users/behzad/.zcode/workspace/default/dxf-tools/neshan-test.html', { waitUntil: 'load', timeout: 40000 });
  await page.waitForTimeout(12000);
  const errs = await page.evaluate(() => window._errors || []);
  const ok = await page.evaluate(() => window._ok || '');
  console.log('ok=', ok, 'errors=', JSON.stringify(errs).slice(0, 200));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
