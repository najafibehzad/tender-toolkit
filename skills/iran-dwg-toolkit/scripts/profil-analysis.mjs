// تحلیل فنی پروفیل v2: شیب‌های طبیعی، حوضه‌ها، خط پروژهٔ منطبق بر زمین با شیب‌های مجاز، برش/پر/مخلوط + حجم
import fs from 'fs';

const rows = fs.readFileSync('entities.tsv','utf8').split(/\r?\n/).filter(Boolean);
rows.shift();
const ents = rows.map(l=>l.split('\t')).map(c=>({space:c[0],type:c[1],layer:c[2],info:c[3]||'',geom:c[4]||''}));
const ptsOf = g => g.split(';').filter(s=>s&&s!=='C'&&s!=='O'&&s!=='CLASSIC')
  .map(s=>s.split(',').map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1]));

const X0=1708.2, E0=88, Y0=1650.8, VEX=10;
const elevOf = y => E0 + (y-Y0)/VEX;

const chain = ents.filter(e=>e.layer==='C-ROAD-PROF'&&/POLYLINE/.test(e.type))
  .map(r=>ptsOf(r.geom)).sort((a,b)=>a[0][0]-b[0][0]).flat();
chain.sort((a,b)=>a[0]-b[0]);
const egAt = st => {
  const x = 1708.2+st;
  for (let i=1;i<chain.length;i++){
    if (chain[i][0]>=x){
      const a=chain[i-1],b=chain[i], t=(x-a[0])/((b[0]-a[0])||1);
      return elevOf(a[1]+(b[1]-a[1])*t);
    }
  }
  return elevOf(chain[chain.length-1][1]);
};
const STMAX = Math.floor(chain[chain.length-1][0]-1708.2);

// --- عرض خیابان: دو جدول بلند موازی
const curbLines = ents.filter(e=>e.layer==='Curb'&&/POLYLINE/.test(e.type)).map(r=>ptsOf(r.geom))
  .map(p=>({p,len:p.reduce((a,q,i)=>i?a+Math.hypot(q[0]-p[i-1][0],q[1]-p[i-1][1]):0,0)}))
  .sort((a,b)=>b.len-a.len).slice(0,2).map(o=>o.p);
function distPtSeg(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1];const t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p[0]-(a[0]+t*dx),p[1]-(a[1]+t*dy));}
let wsum=0,wn=0;
for (let i=0;i<curbLines[0].length;i+=5){
  let best=Infinity;
  for (let j=1;j<curbLines[1].length;j++) best=Math.min(best,distPtSeg(curbLines[0][i],curbLines[1][j-1],curbLines[1][j]));
  wsum+=best;wn++;
}
const WIDTH = 20; // فرض: عرض بین جدول‌ها از نقشه قابل استخراج نبود (دو خط موازی ۰.۷م فاصله = جدول+بستر یک سمت)

// --- پارامترها
const MIN_S=0.003, MAX_S=0.08; // حداقل شیب زهکشی ۰٫۳٪ - حداکثر ۸٪
const TRENCH_W=0.30, TRENCH_D=0.40; // جوی جدول دو طرف

// --- خط پروژه: ردیابی زمین با شیب‌های مجاز
const PVI_STEP=100;
const nP=Math.floor(STMAX/PVI_STEP)+1;
const d=[egAt(0)];
for (let i=1;i<nP;i++){
  const s=i*PVI_STEP, L=s-(i-1)*PVI_STEP;
  let g=(egAt(s)-d[i-1])/L;
  if (Math.abs(g)<MIN_S) g=(g>=0?1:-1)*MIN_S;
  if (Math.abs(g)>MAX_S) g=(g>=0?1:-1)*MAX_S;
  d.push(d[i-1]+g*L);
}
// انتهای مسیر
const sLast=STMAX, Llast=sLast-(nP-1)*PVI_STEP;
let gLast=(egAt(sLast)-d[nP-1])/(Llast||1);
if (Math.abs(gLast)<MIN_S) gLast=(gLast>=0?1:-1)*MIN_S;
if (Math.abs(gLast)>MAX_S) gLast=(gLast>=0?1:-1)*MAX_S;
const designAt=st=>{
  const i=Math.min(nP-1, Math.floor(st/PVI_STEP));
  const s0=i*PVI_STEP;
  let g;
  if (i<nP-1) g=(d[i+1]-d[i])/PVI_STEP;
  else g=gLast;
  return d[i]+g*(st-s0);
};

console.log('== مشخصات ==');
console.log('طول: '+STMAX+' متر | عرض بین جدول‌ها: ~'+WIDTH+' متر | زمین: '+egAt(0).toFixed(1)+' تا '+egAt(STMAX).toFixed(1)+' متر');

console.log('\n== شیب زمین طبیعی (٪، هر ۱۰۰م) — زیر ۰٫۳٪ یعنی آب راکد می‌ماند ==');
for (let s=0;s+100<=STMAX;s+=100){
  const g=((egAt(s+100)-egAt(s))/100)*100;
  console.log('  ۰+'+String(s).padStart(3,'0')+' → ۰+'+String(s+100).padStart(3,'0')+': '+(g>=0?'+':'')+g.toFixed(2)+'٪'+(Math.abs(g)<0.3?'  ⚠ کم‌شیب':''));
}

console.log('\n== گودی‌های زمین (حوضهٔ آب‌گیر → محل کول/زیرعبور) ==');
for (let s=100;s<STMAX;s+=20){
  const a=egAt(s-20),b=egAt(s),c=egAt(s+20);
  if (b<a && b<c && (a-b)>0.03 && (c-b)>0.03) console.log('  ۰+'+String(s).padStart(3,'0')+'m  تراز '+b.toFixed(2));
}

console.log('\n== خط پروژهٔ پیشنهادی (PVI هر ۱۰۰ متر) ==');
for (let i=0;i<nP;i++){
  const g=i<nP-1?((d[i+1]-d[i])/PVI_STEP)*100:gLast*100;
  console.log('  ۰+'+String(i*PVI_STEP).padStart(3,'0')+': تراز طرح '+d[i].toFixed(2)+' (شیب به بعد: '+g.toFixed(2)+'٪)');
}
console.log('  ۰+'+String(sLast).padStart(3,'0')+': تراز طرح '+designAt(sLast).toFixed(2));

console.log('\n== برش / پرکردگی / مخلوط (هر ۱۰۰ متر، عمق متوسط) ==');
let cut=0, fill=0;
const win=[];
for (let s=0;s<STMAX;s+=20){
  const diff=designAt(s)-egAt(s);
  win.push({s,diff});
  if (diff<0) cut+=(-diff)*20*WIDTH; else fill+=diff*20*WIDTH;
}
for (let i=0;i<win.length;i+=5){
  const grp=win.slice(i,i+5);
  if (!grp.length) break;
  const avg=grp.reduce((a,o)=>a+o.diff,0)/grp.length;
  const hasCut=grp.some(o=>o.diff<-0.05), hasFill=grp.some(o=>o.diff>0.05);
  const t=!hasCut&&!hasFill?'مماس':hasCut&&hasFill?'مخلوط':hasCut?'برش':'پرکردگی';
  const s0=grp[0].s, s1=grp[grp.length-1].s+20;
  console.log('  ۰+'+String(s0).padStart(3,'0')+' تا ۰+'+String(s1).padStart(3,'0')+': '+(avg>=0?'+':'')+avg.toFixed(2)+' متر → '+t);
}
console.log('\nحجم (پریزم عرض '+WIDTH+' متر): برش ≈ '+cut.toFixed(0)+' m³ | پرکردگی ≈ '+fill.toFixed(0)+' m³ | مازاد پرکردگی: '+(fill-cut).toFixed(0)+' m³');
const trench=(2*STMAX*TRENCH_W*TRENCH_D);
console.log('خاکبرداری جویِ جدول (دو طرف، '+TRENCH_W+'×'+TRENCH_D+'): ≈'+trench.toFixed(0)+' m³ — جدای از پرکردگی پریزم');
