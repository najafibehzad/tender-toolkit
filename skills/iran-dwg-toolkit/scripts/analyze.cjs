// Analyze entities.tsv produced by dump.lsp → compact Persian-ready summary
const fs = require('fs');
const path = require('path');
const file = process.argv[2] || path.join(__dirname, 'entities.tsv');
if (!fs.existsSync(file)) { console.error('TSV not found: ' + file); process.exit(1); }

const rows = fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
const header = rows.shift().split('\t');
const ents = rows.map(l => l.split('\t')).map(c => ({
  space: c[0], type: c[1], layer: c[2], info: c[3] || '', geom: c[4] || ''
}));

// counts by type
const byType = {}, byLayer = {};
for (const e of ents) {
  byType[e.type] = (byType[e.type] || 0) + 1;
  byLayer[e.layer] = (byLayer[e.layer] || 0) + 1;
}

// extents from all coordinates in geom
let xs = [], ys = [];
const pushPt = p => { if (p && p.length >= 2 && isFinite(+p[0]) && isFinite(+p[1])) { xs.push(+p[0]); ys.push(+p[1]); } };
for (const e of ents) {
  const parts = e.geom.split(';').filter(s => s && !/^[CO]$/.test(s) && !/^(rot|sx)=/.test(s) && s !== 'CLASSIC');
  for (const p of parts) pushPt(p.split(','));
}
let ext = '';
if (xs.length) {
  const f = n => (Math.round(n * 1000) / 1000).toLocaleString('en-US');
  ext = `x: ${f(Math.min(...xs))} … ${f(Math.max(...xs))}  |  y: ${f(Math.min(...ys))} … ${f(Math.max(...ys))}`;
}

// texts & blocks
const texts = ents.filter(e => /TEXT|MTEXT/.test(e.type) && e.info).map(e => e.info.replace(/\r?\n/g, ' '));
const blocks = {};
for (const e of ents.filter(e => e.type === 'INSERT')) blocks[e.info] = (blocks[e.info] || 0) + 1;

console.log('== خلاصهٔ نقشه ==');
console.log('تعداد کل موجودیت‌ها:', ents.length, '(مدل:', ents.filter(e=>e.space==='M').length, '/ کاغذ:', ents.filter(e=>e.space==='P').length, ')');
console.log('\n-- بر اساس نوع --');
for (const [t, n] of Object.entries(byType).sort((a,b)=>b[1]-a[1])) console.log(`  ${t}: ${n}`);
console.log('\n-- بر اساس لایه --');
for (const [t, n] of Object.entries(byLayer).sort((a,b)=>b[1]-a[1])) console.log(`  ${t}: ${n}`);
if (ext) console.log('\n-- حدود نقشه --\n  ' + ext);
if (Object.keys(blocks).length) {
  console.log('\n-- بلوک‌ها --');
  for (const [t, n] of Object.entries(blocks).sort((a,b)=>b[1]-a[1])) console.log(`  ${t}: ${n}`);
}
if (texts.length) {
  console.log('\n-- متن‌ها (' + texts.length + ') --');
  for (const t of texts.slice(0, 40)) console.log('  • ' + t);
  if (texts.length > 40) console.log('  … و ' + (texts.length - 40) + ' مورد دیگر');
}
