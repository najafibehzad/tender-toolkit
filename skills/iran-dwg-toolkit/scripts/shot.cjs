const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  await page.goto('file:///C:/Users/behzad/.zcode/workspace/default/dxf-tools/niasari-preview.html', { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(10000);
  await page.screenshot({ path: 'preview-shot.png' });
  await browser.close();
  console.log('screenshot saved');
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
