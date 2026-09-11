#!/usr/bin/env node
// build-checklist.mjs — چک‌لیست شرکت در مناقصهٔ سامانه ستاد
// Usage:
//   node build-checklist.mjs "<شماره فراخوان یا عبارت از عنوان>" "<شهر>" [--pick N] [--no-open]
//   node build-checklist.mjs --json input.json [--no-open]
// خروجی: PDF چک‌لیست روی دسکتاپ (باز شدن خودکار) + HTML در data/
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, '..', 'data');
const ASSETS = path.join(HERE, '..', 'assets');
const DESKTOP = 'C:\\Desktop';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';
// میزبان‌ها ثابت‌اند؛ درخواست فقط «مسیر» می‌گیرد و اوریجن هرگز از ورودی نمی‌آید
const GW = 'https://gw.setadiran.ir';
const ETEND = 'https://etend.setadiran.ir';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

// ---------- آرگومان‌ها ----------
const argv = process.argv.slice(2);
const flags = { noOpen: argv.includes('--no-open') };
const pickIdx = argv.indexOf('--pick');
flags.pick = pickIdx >= 0 ? Number(argv[pickIdx + 1]) : null;
let jsonFile = null, query = null, city = null;
const ji = argv.indexOf('--json');
if (ji >= 0) { jsonFile = argv[ji + 1]; }
else { query = argv.find(a => !a.startsWith('--')); city = argv.filter(a => !a.startsWith('--') && a !== query)[0] || null; }

// ---------- تبدیل تقویم جلالی (الگوریتم استاندارد jalaali) ----------
const div = (a, b) => ~~(a / b);
const mod = (a, b) => a - ~~(a / b) * b;
function jalCal(jy) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  const gy = jy + 621; let leapJ = -14, jp = breaks[0], jm, jump = 0, n, i;
  for (i = 1; i < breaks.length; i++) { jm = breaks[i]; jump = jm - jp; if (jy < jm) break; leapJ += div(jump, 33) * 8 + div(mod(jump, 33), 4); jp = jm; }
  n = jy - jp;
  leapJ += div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) leap = 4;
  return { leap, gy, march };
}
function g2d(gy, gm, gd) {
  let d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) + div(153 * mod(gm + 9, 12) + 2, 5) + gd - 34840408;
  return d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
}
function j2d(jy, jm, jd) { const r = jalCal(jy); return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1; }
function d2g(jdn) {
  let j = 4 * jdn + 139361631; j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  return { gd: div(mod(i, 153), 5) + 1, gm: mod(div(i, 153), 12) + 1, gy: div(j, 1461) - 100100 + div(8 - mod(div(i, 153), 12) - 1, 6) };
}
function d2j(jdn) {
  const g = d2g(jdn); let jy = g.gy - 621; const r = jalCal(jy);
  const jdn1f = j2d(jy, 1, 1); let k = jdn - jdn1f;
  if (k >= 0) { if (k <= 185) return { jy, jm: 1 + div(k, 31), jd: mod(k, 31) + 1 }; k -= 186; }
  else { jy -= 1; k += 179; if (r.leap === 1) k += 1; }
  return { jy, jm: 7 + div(k, 30), jd: mod(k, 30) + 1 };
}
// امروز شمسی
const now = new Date();
const todayG = { gy: now.getFullYear(), gm: now.getMonth() + 1, gd: now.getDate() };
const TODAY_JDN = g2d(todayG.gy, todayG.gm, todayG.gd);
const faNum = s => String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

// تاریخ/ساعت شمسی "1405/06/21 13:00" یا "1405/07/05 - 12:00"
function parseJ(s) {
  const m = /(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\D+(\d{1,2}):(\d{2}))?/.exec(String(s || ''));
  if (!m) return null;
  const jy = +m[1], jm = +m[2], jd = +m[3];
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  return { jy, jm, jd, hh: m[4] ? +m[4] : null, mm: m[5] ? +m[5] : null, jdn: j2d(jy, jm, jd) };
}
const daysLeft = p => p ? p.jdn - TODAY_JDN : null;
const statusOf = d => { if (d == null) return 'none'; if (d < 0) return 'late'; if (d <= 3) return 'soon'; return 'ok'; };

// ---------- HTTP ----------
function request(u) {
  return new Promise((res, rej) => {
    if (u.protocol !== 'https:') return rej(new Error('only https'));
    const r = https.get(u, { headers: { 'User-Agent': UA } }, x => { let d = ''; x.on('data', c => d += c); x.on('end', () => res(d)); });
    r.on('error', rej); r.setTimeout(40000, () => { r.destroy(); rej(new Error('timeout')); });
  });
}
async function apiGet(origin, pathname, params) {
  const u = new URL(origin + pathname);
  if (u.origin !== origin || u.protocol !== 'https:') throw new Error('bad request target');
  for (const [k, v] of Object.entries(params || {})) u.searchParams.set(k, v);
  return request(u);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function apiJson(origin, pathname, params, tries = 3) {
  let last;
  for (let t = 0; t < tries; t++) { try { return JSON.parse(await apiGet(origin, pathname, params)); } catch (e) { last = e; if (t < tries - 1) await sleep(900); } }
  throw last;
}
const norm = s => String(s || '').replace(/\u200c/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- حل شهر/استان (کش data/city-map.json) ----------
const mapPath = path.join(DATA, 'city-map.json');
async function resolveCity(cityName) {
  let map = {};
  if (fs.existsSync(mapPath)) { try { map = JSON.parse(fs.readFileSync(mapPath, 'utf8')); } catch { map = {}; } }
  const key = norm(cityName);
  if (map[key]) return map[key];
  // ساخت کش: ۳۱ استان + فرزندان
  const raw = await apiJson(GW, '/api/centralboard/cards/setadCity', { pageNumber: '', pageSize: '', sort: 'id,desc' });
  const rows = Array.isArray(raw) ? raw : (raw.content || []);
  const nameOf = r => norm(r.cityName || r.name || r.title || r.locName);
  const idOf = r => { const v = String(r.locId ?? r.id ?? '').trim(); return /^\d{1,12}$/.test(v) ? v : null; };
  for (const p of rows) {
    const pid = idOf(p); if (!pid) continue;
    let kids = [];
    try { const k = await apiJson(GW, '/api/centralboard/cards/setadCity', { parentLocId: pid, pageNumber: '', pageSize: '', sort: 'id,desc' }); kids = Array.isArray(k) ? k : (k.content || []); } catch { }
    const put = (nm, cid) => { const kk = norm(nm); if (nm && !map[kk]) map[kk] = { city: nm, cityId: cid, provId: pid, province: nameOf(p) }; };
    for (const k of kids) { const kid = idOf(k); put(nameOf(k), kid); }
    put(nameOf(p), pid); // خود استان هم به‌عنوان گزینه
    await sleep(120);
  }
  fs.mkdirSync(DATA, { recursive: true });
  fs.writeFileSync(mapPath, JSON.stringify(map, null, 1), 'utf8');
  if (map[key]) return map[key];
  // تطبیق شامل
  const hit = Object.entries(map).find(([k]) => k.includes(key) || key.includes(k));
  if (hit) return hit[1];
  throw new Error('شهر پیدا نشد: ' + cityName + ' — نمونه: ' + Object.keys(map).slice(0, 25).join(' | '));
}

// ---------- واکشی آگهی‌های شهر ----------
async function fetchCityItems(sel) {
  const seen = new Set(); const out = [];
  for (let p = 0; p < 300; p++) {
    const j = await apiJson(GW, '/api/centralboard/cards/', { searchTypeCode: '0', selectedCities: sel, queryText: '', pageNumber: String(p), pageSize: '10', sort: 'insertDate,desc' });
    for (const it of (j.content || [])) if (!seen.has(it.number)) { seen.add(it.number); out.push(it); }
    if (out.length >= (j.totalElements || 0) || !(j.content || []).length) break;
    await sleep(150);
  }
  return out;
}

// ---------- تطبیق ----------
function matchItems(items, q) {
  const digits = q.replace(/\D/g, '');
  if (digits.length >= 10) return items.filter(i => String(i.number).includes(digits));
  const words = norm(q).split(' ').filter(Boolean);
  return items.filter(i => words.every(w => norm(i.title + ' ' + i.orgName + ' ' + i.cityName).includes(w)));
}

// ---------- پارس جزئیات etend ----------
const decode = s => (s || '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
function parseTender(html) {
  const g = {};
  for (const m of html.matchAll(/<input[^>]*name="([^"]+)"[^>]*value="([^"]*)"/g)) {
    const n = m[1], v = decode(m[2]);
    if (!g[n]) g[n] = v; else if (typeof g[n] === 'string') g[n] = [g[n], v]; else g[n].push(v);
  }
  for (const m of html.matchAll(/<textarea[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/textarea>/g)) g[m[1]] = decode(m[2]);
  for (const m of html.matchAll(/<select[^>]*name="([^"]+)"[\s\S]*?<\/select>/g)) {
    const sel = [...m[0].matchAll(/<option[^>]*selected[^>]*>([^<]*)</g)].map(o => decode(o[1]));
    if (sel.length) g[m[1]] = sel.join(' | ');
  }
  return g;
}

// ---------- ساخت مدل ----------
async function modelFromSetadiran() {
  if (!query) throw new Error('کوئری خالی');
  let sel = null, province = null;
  if (city) { const c = await resolveCity(city); province = c.province; sel = c.provId + '-' + c.cityId; console.log('CITY:', city, '→', province, '(prov=' + c.provId + ' city=' + c.cityId + ')'); }
  else throw new Error('شهر را بده: node build-checklist.mjs "<کوئری>" "<شهر>"');
  const items = await fetchCityItems(sel);
  let hits = matchItems(items, query);
  if (!hits.length) throw new Error('چیزی مطابق «' + query + '» در ' + city + ' پیدا نشد (' + items.length + ' آگهی بررسی شد)');
  hits = hits.slice(0, 8);
  if (hits.length > 1 && flags.pick == null) {
    console.log('MULTI-MATCH — با --pick <n> انتخاب کن:');
    hits.forEach((h, i) => console.log('  [' + (i + 1) + '] ' + h.number + ' | ' + h.boardName + ' | ' + norm(h.title).slice(0, 70)));
    process.exit(3);
  }
  const it = hits[(flags.pick || 1) - 1];
  if (!it) throw new Error('--pick خارج از محدوده');
  const m = {
    title: norm(it.title), org: norm(it.orgName), callNumber: String(it.number), city: norm(it.cityName),
    province: norm(it.provinceName), board: it.boardName, url: '', subject: '', rating: '', notes: '',
    estimate: '', docsPrice: '', docsAccount: '', guaranty: '',
    docDeadline: it.jalaliDocumentDeadlineDate || '', sendDeadline: it.jalaliSendDeadlineDate || '',
    opening: '', validUntil: '', physicalDeadline: '', physicalAddress: '', physicalFromOrg: norm(it.orgName),
  };
  const tableId = String(it.tableId || '').trim();
  if (it.boardName === 'مناقصه' && /^\d{1,15}$/.test(tableId)) {
    m.url = 'https://etend.setadiran.ir/etend/centralBoardTenderDetails-execute.action?tenderId=' + tableId;
    const html = await apiGet(ETEND, '/etend/centralBoardTenderDetails-execute.action', { tenderId: tableId });
    const f = parseTender(html);
    const one = v => Array.isArray(v) ? v[0] : v;
    m.subject = one(f['tenderDto.tender.subjectAllowedName']) || '';
    const setup = one(f['tenderDto.tender.setupType']); if (setup) m.subject = (m.subject ? m.subject + ' — ' : '') + setup;
    m.estimate = one(f['tenderDto.tender.financialEstimatePrice']) || m.estimate;
    m.docsPrice = one(f['tenderDto.tender.tenderDocumentsPrice']) || m.docsPrice;
    m.docsAccount = one(f['tenderDto.tender.tenderDocumentsPriceAccount.id']) || m.docsAccount;
    m.guaranty = one(f['tenderDto.tender.guarantyPrice']) || m.guaranty;
    const gd = one(f['tenderDto.documentsDeadlineDateEx']), gt = one(f['tenderDto.documentsDeadlineTimeEx']);
    const pd = one(f['tenderDto.proposalDeadlineDateEx']), pt = one(f['tenderDto.proposalDeadlineTimeEx']);
    const od = one(f['tenderDto.openingDateEx']), ot = one(f['tenderDto.openingTimeEx']);
    const vd = one(f['tenderDto.offersValidDateEx']), vt = one(f['tenderDto.offersValidTimeEx']);
    if (gd) m.docDeadline = gd + (gt ? ' ' + gt : '');
    if (pd) m.sendDeadline = pd + (pt ? ' ' + pt : '');
    if (od) m.opening = od + (ot ? ' ' + ot : '');
    if (vd) m.validUntil = vd + (vt ? ' ' + vt : '');
    const addr = one(f['tenderDto.tender.address']); if (addr) m.physicalAddress = norm(addr);
    const desc = one(f['tenderDto.tender.description']); if (desc) m.notes = norm(desc).slice(0, 300);
    if (it.basePrice && !m.estimate) m.estimate = String(it.basePrice);
  } else if (it.basePrice) { m.estimate = String(it.basePrice); }
  return m;
}
function modelFromJson() {
  const j = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  const m = {
    title: norm(j.title), org: norm(j.org || ''), callNumber: String(j.callNumber || ''), city: norm(j.city || ''),
    province: norm(j.province || ''), board: norm(j.board || 'مناقصه'), url: j.url || '', subject: norm(j.subject || ''),
    rating: norm(j.rating || ''), notes: norm(j.notes || ''), estimate: String(j.estimate || ''), docsPrice: String(j.docsPrice || ''),
    docsAccount: String(j.docsAccount || ''), guaranty: String(j.guaranty || ''), docDeadline: j.docDeadline || '',
    sendDeadline: j.sendDeadline || '', opening: j.opening || '', validUntil: j.validUntil || '',
    physicalDeadline: j.physicalDeadline || '', physicalAddress: norm(j.physicalAddress || ''), physicalFromOrg: norm(j.org || ''),
  };
  if (!m.title) throw new Error('title در json الزامی است');
  return m;
}

// ---------- زمان‌بندی ----------
function schedule(m) {
  const dDoc = parseJ(m.docDeadline), dSend = parseJ(m.sendDeadline), dOpen = parseJ(m.opening), dValid = parseJ(m.validUntil);
  const dPhys = parseJ(m.physicalDeadline) || dSend;
  const rows = [
    { label: 'خرید و دانلود اسناد از ستاد', p: dDoc, hint: 'پیشنهاد: امروز/فوراً — بعد از این مهلت اصلاً نمی‌شود شرکت کرد' },
    { label: 'آماده‌سازی ضمانت‌نامه بانکی (پاکت الف)', p: dSend, hint: 'از بانک ۱ تا ۳ روز کاری زمان می‌برد — آخرین هفته شروع نکن', offset: -3 },
    { label: 'بارگذاری پاکت‌های ب (فنی) و ج (مالی) در ستاد', p: dSend, hint: 'پیشنهاد: حداقل یک روز قبل از مهلت بارگذاری کن', offset: -1 },
    { label: 'تحویل فیزیکی اصل پاکت الف به ' + (m.physicalAddress || 'دستگاه مناقصه‌گزار'), p: dPhys, hint: 'بدون اصل ضمانت‌نامه پیشنهاد مطلقاً بررسی نمی‌شود' },
    { label: 'بازگشایی پاکت‌ها', p: dOpen, hint: 'اینترنت وصل باشد؛ نیاز به اعتبارسنجی آنلاین اسناد امضاشده' },
    { label: 'اعتبار پیشنهاد تا', p: dValid, hint: 'تمدید/لغو تمدید بعداً از کارتابل اطلاع‌رسانی می‌شود' },
  ].filter(r => r.p);
  for (const r of rows) {
    r.days = daysLeft(r.p);
    r.status = statusOf(r.days);
    r.suggest = r.offset ? d2j(r.p.jdn + r.offset) : null;
    r.dateStr = faNum(r.p.jy + '/' + String(r.p.jm).padStart(2, '0') + '/' + String(r.p.jd).padStart(2, '0')) + (r.p.hh != null ? ' — ' + faNum(String(r.p.hh).padStart(2, '0') + ':' + String(r.p.mm).padStart(2, '0')) : '');
    r.dayStr = r.days == null ? '' : (r.days < 0 ? faNum(-r.days) + ' روز گذشته' : r.days === 0 ? 'امروز!' : faNum(r.days) + ' روز مانده');
  }
  return rows;
}

// ---------- چک‌لیست اقدامات ----------
function phases(m, sched) {
  const byKey = k => sched.find(r => r.label.includes(k));
  const sDoc = byKey('خرید و دانلود'), sSend = byKey('بارگذاری');
  const hasAcct = m.docsAccount ? ' به حساب «' + m.docsAccount + '»' : '';
  const P = [];
  P.push({
    n: '۰', title: 'پیش‌نیازهای یک‌بارهٔ شرکت (اگر تا امروز نداری)', tip: 'فقط بار اول؛ بدون این‌ها ثبت پیشنهاد در ستاد ممکن نیست. اگر داری، همه را تیک بزن.',
    items: [
      { t: 'ثبت‌نام شرکت در setadiran.ir با نقش مناقصه‌گر (فقط مدیرعامل ایرانی، آنلاین)', how: 'منوی ورود/ثبت‌نام ← ثبت‌نام تأمین‌کننده/مناقصه‌گر ← فرم با صحت‌سنجی ثبت‌شرکت/احوال؛ کد پیامکی به موبایل مدیرعامل' },
      { t: 'توکن + گواهی امضای الکترونیکی مدیرعامل و مهر سازمانی', how: 'gica.ir/totalca ← نوع گواهی غیردولتی (یک/دوساله) ← کد رهگیری ← دفتر اسناد رسمی؛ هر که اسناد را امضا می‌کرد باید گواهی داشته باشد' },
      { t: 'نصب برنامهٔ مهروموم + درایور توکن + .NET 4.5', how: 'از منوی «امضای الکترونیکی» سامانه؛ حین امضا اینترنت وصل باشد (اعتبارسنجی آنلاین)' },
      { t: 'پرداخت حق عضویت/آبونمان سالانهٔ ستاد', how: 'از بخش قوانین و مقررات سایت ستاد؛ بدون پرداخت، خدمات قطع است' },
      { t: 'تکمیل پروفایل و تطبیق صاحبان امضا', how: 'اطلاعات امضاکنندگان در پروفایل باید دقیقاً با امضای انتهای فایل‌ها مطابق باشد وگرنه پاکت رد می‌شود' },
    ],
  });
  P.push({
    n: '۱', title: 'خرید اسناد (سریع‌تر بهتر — تا ' + (sDoc ? sDoc.dateStr : 'مهلت اعلامی') + ')', tip: 'پس از این مهلت راه ورودی نیست.',
    items: [
      { t: 'افزودن فراخوان به کارتابل و پرداخت هزینهٔ اسناد' + (m.docsPrice ? ' (' + faNum(m.docsPrice) + ' ریال)' : '') + hasAcct, how: 'کارتابل ← فراخوان‌ها ← جستجو با شمارهٔ فراخوان ← «افزودن به فراخوان‌های من» ← پرداخت' },
      { t: 'دانلود اسناد و مطالعهٔ شرایط اختصاصی و جدول ارزیابی', how: 'ستون «دانلود اسناد» فعال می‌شود؛ فهرست مدارک پاکت ب فقط داخل همین اسناد است — عین آن فهرست را جمع کن' },
      { t: 'تطبیق صلاحیت شرکت با شرایط' + (m.rating ? ' (رتبه لازم: ' + m.rating + ')' : ''), how: 'رتبه/سوابق/اعتبار مالی/تجهیزات را با جدول ارزیابی بسنج؛ تردیدی هست، با مسئول مناقصه تماس بگیر' },
      { t: 'رسید پرداخت را نگه دار', how: 'در سامانه دوباره قابل دریافت نیست' },
    ],
  });
  P.push({
    n: '۲', title: 'آماده‌سازی مدارک (همین حالا شروع کن — کار سنگین اینجاست)', tip: 'هر پاکت را در پوشهٔ جدا جمع کن؛ PDF نهایی طبق قواعد مهروموم (فضای امضا در انتهای آخرین صفحه، شماره صفحه).',
    items: [
      { t: 'پاکت الف — درخواست ضمانت‌نامه بانکی' + (m.guaranty ? ' به مبلغ ' + faNum(m.guaranty) + ' ریال' : ' به مبلغ اعلامی در اسناد'), how: 'ضمانت‌نامه غیرمشروط/مؤسسه معتبر به نام دستگاه مناقصه‌گزار؛ اعتبار تا تاریخ اعلامی (معمولاً تا بازگشایی + ۶۰-۹۰ روز)؛ یا فیش واریز به حساب اعلامی. چک شخصی/مشروط = بی‌اثر' },
      { t: 'پاکت ب — مدارک احراز صلاحیت طبق فهرست اسناد', how: 'روزنامهٔ آخرین تغییرات + آخرین صورتحساب/آگهی، گواهی رتبه معتبر، سوابق مشابه، اظهارنامهٔ مالیاتی، گواهی‌های بیمه/عدم بدهی و هرچه جدول ارزیابی خواسته — کمبود = رد، اضافه اشکال ندارد' },
      { t: 'پاکت ج — پیشنهاد قیمت', how: 'فرم پیشنهاد از داخل اسناد؛ نرخ‌ها با فهرست‌بها/آنالیز (اسکیل‌های آنالیز و مصالح کمک می‌کنند)؛ حروف و اعداد جمع کل یکسان؛ اعتبار پیشنهاد' + (m.validUntil ? ' تا ' + faNum(m.validUntil) : ' طبق اسناد') },
      { t: 'امضای الکترونیکی همهٔ فایل‌ها با مهروموم', how: 'توکن وصل ← مهروموم ← انتخاب فایل ← امضا؛ هر صاحب امضا + مهر سازمانی؛ خروجی pdf + esf — فقط esf آپلود می‌شود' },
    ],
  });
  P.push({
    n: '۳', title: 'ارسال (تا ' + (sSend ? sSend.dateStr : 'مهلت اعلامی') + ')', tip: 'همهٔ اقدامات این فاز قبل از ساعت مهلت؛ پیشنهاد: یک روز زودتر.',
    items: [
      { t: 'بارگذاری پاکت ب (esf) و پاکت ج (esf)', how: 'کارتابل ← شرکت در مناقصه؛ فقط یک مرورگر/یک تب؛ فایل باید خروجی رمزنگاری‌شدهٔ مهروموم باشد وگرنه خطا' },
      { t: 'تحویل فیزیکی اصل پاکت الف' + (m.physicalAddress ? ' — ' + m.physicalAddress : ''), how: 'حضوری قبل از ساعت مهلت؛ رسید تحویل بگیر' },
      { t: 'چک نهایی پیش از ارسال', how: 'مبلغ ضمانت = عدد اعلامی؛ امضاها با پروفایل مطابق؛ تعداد فایل طبق آگهی (گاهی پاکت ب حداکثر ۲ فایل)؛ همهٔ مدارک فهرست‌شده موجود' },
      { t: 'بعد از ارسال: تا پایان مهلت اصلاح ممکن است', how: 'پاکت را بازپس بگیر و دوباره بفرست؛ بعد از مهلت تا بازگشایی، بازپس‌گیری = انصراف' },
    ],
  });
  P.push({
    n: '۴', title: 'بعد از ارسال', tip: 'پیگیری نتیجه و تعهدات برنده.',
    items: [
      { t: 'روز بازگشایی آنلاین باش', how: 'سامانه برای اعتبارسنجی پاکت‌های امضاشده اینترنت می‌خواهد؛ نتایج و رتبه در کارتابل «ارسال پیشنهاد»' },
      { t: 'در صورت برنده‌شدن: کارمزد ستاد + عقد قرارداد ≤ ۷ روز', how: 'کارمزد (درصد معاملهٔ موفق طبق ردیف ۱۶ قانون بودجه) هنگام پذیرش برنده؛ ابلاغ تا عقد قرارداد حداکثر ۷ روز — وگرنه سپرده ضبط و قرارداد با نفر بعد' },
      { t: 'برندهٔ دوم/سوم هم آمادهٔ عقد باش', how: 'اگر ظرف ۷ روز بعد از ابلاغ حاضر به عقد نشوی، سپرده‌ات ضبط می‌شود' },
      { t: 'هزینهٔ درج آگهی معمولاً بر عهدهٔ برنده است', how: 'در آگهی‌های شهرداری‌ها ذکر می‌شود؛ در اسناد چک کن' },
    ],
  });
  return P;
}

// ---------- HTML ----------
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function chip(st, txt) {
  const c = st === 'late' ? 'chip-late' : st === 'soon' ? 'chip-soon' : st === 'ok' ? 'chip-ok' : '';
  return '<span class="chip ' + c + '">' + txt + '</span>';
}
function buildHtml(m, sched, ph) {
  const nowFa = new Intl.DateTimeFormat('fa-IR', { dateStyle: 'full' }).format(new Date());
  const allLate = sched.length && sched.every(r => r.status === 'late' || r.status === 'none');
  const dl = sched.map(r => {
    const cls = r.status === 'late' ? 'late' : r.status === 'soon' ? 'soon' : 'ok';
    const tag = r.status === 'late' ? 'مهلت گذشته' : r.status === 'soon' ? 'فوری' : '';
    return '<tr class="' + cls + '"><td>' + esc(r.label) + '</td><td class="nowrap">' + r.dateStr + '</td><td class="nowrap">' + esc(r.dayStr) + '</td><td>' + (tag ? chip(r.status, tag) : '') + (r.suggest && r.days >= Math.abs(r.offset) ? '<div class="hint">بهتره تا ' + faNum(r.suggest.jy + '/' + String(r.suggest.jm).padStart(2, '0') + '/' + String(r.suggest.jd).padStart(2, '0')) + ' تمام شده باشد</div>' : '') + '</td></tr>';
  }).join('\n');
  const rows = [
    ['دستگاه مناقصه‌گزار', m.org], ['شمارهٔ فراخوان (ستاد)', faNum(m.callNumber) || '—'],
    ['استان / شهر', (m.province || '—') + ' / ' + (m.city || '—')], ['نوع/موضوع', m.subject || m.board || '—'],
    ['برآورد مبلغ (ریال)', m.estimate ? faNum(m.estimate) : '—'], ['هزینهٔ اسناد (ریال)', m.docsPrice ? faNum(m.docsPrice) : '—'],
    ['حساب خرید اسناد', m.docsAccount || '—'], ['سپردهٔ شرکت در مناقصه (ریال)', m.guaranty ? faNum(m.guaranty) : '—'],
    ['رتبه/صلاحیت لازم', m.rating || 'از اسناد مناقصه چک شود'], ['توضیح', m.notes || '—'],
  ].filter(r => r[1] && r[1] !== '—').map(r => '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>').join('\n');
  const phasesHtml = ph.map(p =>
    '<section class="phase"><h2>فاز ' + p.n + ' — ' + esc(p.title) + '</h2><p class="tip">' + esc(p.tip) + '</p>' +
    p.items.map(it => '<div class="item"><span class="cb"></span><div><div class="it">' + esc(it.t) + '</div><div class="how"><b>نحوه:</b> ' + esc(it.how) + '</div></div></div>').join('\n') +
    '</section>').join('\n');
  const font = f => 'file:///' + path.join(ASSETS, 'fonts', f).replace(/\\/g, '/');
  return `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
<title>چک‌لیست شرکت در مناقصه</title>
<style>
@font-face{font-family:Vazirmatn;src:url('${font('Vazirmatn-Regular.woff2')}') format('woff2');font-weight:400}
@font-face{font-family:Vazirmatn;src:url('${font('Vazirmatn-Medium.woff2')}') format('woff2');font-weight:500}
@font-face{font-family:Vazirmatn;src:url('${font('Vazirmatn-SemiBold.woff2')}') format('woff2');font-weight:600}
@font-face{font-family:Vazirmatn;src:url('${font('Vazirmatn-Bold.woff2')}') format('woff2');font-weight:700}
@page{size:A4;margin:11mm 10mm}
*{box-sizing:border-box}
body{font-family:Vazirmatn,sans-serif;font-size:10pt;line-height:1.65;margin:0;color:#1a2433}
h1{font-size:15pt;margin:0 0 2px}
h2{font-size:12pt;margin:0 0 6px;color:#0d47a1;border-bottom:2px solid #0d47a1;padding-bottom:4px}
.subtitle{color:#546e7a;font-size:9.5pt;margin:0}
.head{border-bottom:3px solid #1565c0;padding-bottom:8px;margin-bottom:12px}
.banner{background:#fdecea;border:1.5px solid #c62828;color:#b71c1c;border-radius:6px;padding:8px 12px;font-weight:700;margin:10px 0}
.banner-warn{background:#fff3e0;border:1.5px solid #ef6c00;color:#e65100;border-radius:6px;padding:8px 12px;margin:10px 0;font-weight:600}
table{width:100%;border-collapse:collapse;margin:6px 0 10px}
th,td{border:1px solid #cfd8dc;padding:5px 8px;text-align:right;vertical-align:top}
th{background:#eceff1;font-weight:600}
.kv th{width:32%}
td.nowrap,.nowrap{white-space:nowrap}
tr.ok td{background:#e8f5e9}tr.soon td{background:#fff3e0}tr.late td{background:#fdecea}
.chip{display:inline-block;border-radius:10px;padding:1px 9px;font-size:8pt;font-weight:700;color:#fff}
.chip-late{background:#c62828}.chip-soon{background:#ef6c00}.chip-ok{background:#2e7d32}
.hint{color:#546e7a;font-size:8.5pt;margin-top:2px}
.phase{page-break-inside:avoid;margin:0 0 14px;border:1px solid #cfd8dc;border-radius:8px;padding:10px 12px;background:#fbfdff}
.tip{margin:0 0 8px;color:#546e7a;font-size:9pt}
.item{display:flex;gap:8px;align-items:flex-start;padding:6px 0;border-bottom:1px dashed #cfd8dc}
.item:last-child{border-bottom:none}
.cb{flex:0 0 auto;width:13px;height:13px;border:1.8px solid #37474f;border-radius:3px;margin-top:4px}
.it{font-weight:600}
.how{color:#455a64;font-size:9pt;margin-top:1px}
.warn{border:1.5px solid #c62828;background:#fdecea;border-radius:8px;padding:10px 12px;margin:8px 0}
.warn h2{color:#b71c1c;border-color:#b71c1c}
.warn ul{margin:4px 0 2px;padding-right:18px}
.warn li{margin:3px 0}
.url{font-size:8.5pt;color:#546e7a;word-break:break-all}
.foot{margin-top:12px;padding-top:6px;border-top:1px solid #cfd8dc;color:#78909c;font-size:8pt}
</style></head><body>
<div class="head">
<h1>چک‌لیست شرکت در مناقصه</h1>
<p class="subtitle">${esc(m.title)}${m.callNumber ? ' — فراخوان ' + faNum(m.callNumber) : ''}</p>
<p class="subtitle">ساخته‌شده در ${esc(nowFa)}${m.url ? ' — <a class="url" href="' + esc(m.url) + '">صفحهٔ مناقصه در ستاد</a>' : ''}</p>
</div>
${allLate ? '<div class="banner">هشدار: همهٔ مهلت‌های این مناقصه گذشته است — امکان شرکت جدید نیست. برای فراخوان تجدیدشده دنبال شمارهٔ جدید در ستاد بگرد.</div>' : ''}
<div><h2>مشخصات مناقصه</h2>
<table class="kv">${rows}</table></div>
<div><h2>زمان‌بندی و شمارش روز</h2>
<table><tr><th>اقدام</th><th>مهلت</th><th>وضعیت</th><th>توجه</th></tr>${dl}</table></div>
${phasesHtml}
<section class="warn"><h2>هشدارهای ردّ پیشنهاد — این‌ها پیشنهاد را کلاً می‌سوزانند</h2>
<ul>
<li>اصل پاکت الف (ضمانت‌نامه) فیزیکی نرسد ← پیشنهاد مطلقاً بررسی نمی‌شود؛ اصلاحش بعد از بازگشایی ممنوع است.</li>
<li>پاکت ب/ج با فرمتی غیر از esf (خروجی مهروموم) بارگذاری نمی‌شود؛ فایل امضاشدهٔ بدون رمزنگاری مهروموم خطا می‌دهد.</li>
<li>چک شخصی، ضمانت مشروط/مخدوش یا مبلغ کمتر از اعلامی = بی‌اثر.</li>
<li>امضاهای انتهای فایل باید با پروفایل ستاد و صاحبان امضای مجاز شرکت مطابق باشد.</li>
<li>شمارهٔ فراخوان آگهی‌های محلی را تطبیق بده — ملاک شمارهٔ مناقصهٔ ستاد است (آگهی‌های شهرداری گاهی جابجا چاپ می‌کنند).</li>
<li>پیشنهاد رسیده بعد از مهلت مطلقاً بی‌اثر است؛ حجم فایل را پایین نگه دار.</li>
<li>شهرداری در رد/قبول هر پیشنهادی (حتی همه) مختار است؛ هزینهٔ درج آگهی معمولاً بر عهدهٔ برنده است.</li>
</ul></section>
<div class="foot">منبع دانش: اسناد رسمی سامانهٔ تدارکات الکترونیکی دولت (ستاد) — گواهی امضای الکترونیکی، شرایط و ضوابط، سوالات متداول. این چک‌لیست جایگزین اسناد مناقصه نیست؛ فهرست دقیق مدارک فقط داخل اسناد خریداری‌شده است.</div>
</body></html>`;
}

// ---------- رندر ----------
function renderPdf(htmlPath, pdfPath) {
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
  const r = spawnSync(CHROME, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=10000', '--print-to-pdf=' + pdfPath, fileUrl], { stdio: 'pipe', encoding: 'utf8', timeout: 120000 });
  if (r.status !== 0 || !fs.existsSync(pdfPath)) {
    console.error('CHROME-FAIL status=' + r.status + '\n' + (r.stderr || '').slice(0, 500));
    process.exit(1);
  }
}

// ---------- اجرا ----------
(async () => {
  fs.mkdirSync(DATA, { recursive: true });
  const m = jsonFile ? modelFromJson() : await modelFromSetadiran();
  const sched = schedule(m);
  const ph = phases(m, sched);
  const html = buildHtml(m, sched, ph);
  const htmlPath = path.join(DATA, 'checklist.html');
  fs.writeFileSync(htmlPath, html, 'utf8');
  const pdfTmp = path.join(DATA, 'checklist.pdf');
  renderPdf(htmlPath, pdfTmp);

  const jParts = new Intl.DateTimeFormat('en-US-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const jg = t => Number((jParts.find(p => p.type === t) || {}).value);
  const dateStr = jg('year') + '-' + String(jg('month')).padStart(2, '0') + '-' + String(jg('day')).padStart(2, '0');
  const shortTitle = m.title.length > 40 ? m.title.slice(0, 40) + '…' : m.title;
  const base = path.join(DESKTOP, 'چک‌لیست شرکت در مناقصه ' + shortTitle + ' ' + dateStr);
  let out = base + '.pdf';
  for (let n = 2; n <= 5; n++) {
    try { fs.copyFileSync(pdfTmp, out); break; }
    catch (e) { if (n === 5) throw e; out = base + ' (' + faNum(n) + ').pdf'; }
  }

  const soon = sched.filter(r => r.status === 'soon' || r.status === 'late');
  console.log('DONE — ' + sched.length + ' مهلت، ' + ph.length + ' فاز');
  console.log('NEAREST:', sched.map(r => r.days).filter(d => d != null && d >= 0).sort((a, b) => a - b)[0] ?? '-', 'روز');
  if (soon.length) console.log('URGENT:', soon.map(r => r.label + ' → ' + r.dayStr).join(' | '));
  console.log('PDF:', out);
  if (!flags.noOpen) {
    const r = spawnSync('powershell', ['-NoProfile', '-Command', `Invoke-Item -LiteralPath '${out.replace(/'/g, "''")}'`], { stdio: 'ignore' });
    if (r.status !== 0) console.log('OPEN-FAILED status=' + r.status);
  }
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
