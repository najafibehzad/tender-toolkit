// test the final OL preview page: neshan tiles load? JS errors?
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  const tileHosts = {};
  const errors = [];
  page.on('request', r => {
    const m = r.url().match(/^https?:\/\/([^/]+)/);
    if (m) tileHosts[m[1]] = (tileHosts[m[1]] || 0) + 1;
  });
  page.on('requestfailed', r => { if (/tile|neshan|google|bing|map\.ir/.test(r.url())) errors.push('FAIL ' + r.url().slice(0, 90) + ' :: ' + (r.failure() || {}).errorText); });
  page.on('pageerror', e => errors.push('PAGEERROR ' + String(e).slice(0, 150)));
  await page.goto('file:///C:/Users/behzad/.zcode/workspace/default/dxf-tools/niasari-preview.html', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(9000);
  // switch to google hybrid and wait
  await page.evaluate(() => { document.querySelector('input[value="ghyb"]').click(); });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { document.querySelector('input[value="neshan"]').click(); });
  await page.waitForTimeout(4000);
  console.log('TILE HOSTS:', JSON.stringify(tileHosts, null, 1));
  console.log('ERRORS:', errors.length ? errors.slice(0, 6).join('\n') : 'none');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
