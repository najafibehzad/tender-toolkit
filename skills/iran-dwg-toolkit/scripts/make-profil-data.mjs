// Generate technical PDF source: profile analysis + SVG charts + executive recommendations
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
    if (chain[i][0]>=x){ const a=chain[i-1],b=chain[i],t=(x-a[0])/((b[0]-a[0])||1); return elevOf(a[1]+(b[1]-a[1])*t); }
  }
  return elevOf(chain[chain.length-1][1]);
};
const STMAX = Math.floor(chain[chain.length-1][0]-1708.2);
const WIDTH=20, MIN_S=0.003, MAX_S=0.08, TRENCH_W=0.30, TRENCH_D=0.40;
const PVI_STEP=100, nP=Math.floor(STMAX/PVI_STEP)+1;
const d=[egAt(0)];
for (let i=1;i<nP;i++){
  const s=i*PVI_STEP, L=s-(i-1)*PVI_STEP;
  let g=(egAt(s)-d[i-1])/L;
  if (Math.abs(g)<MIN_S) g=(g>=0?1:-1)*MIN_S;
  if (Math.abs(g)>MAX_S) g=(g>=0?1:-1)*MAX_S;
  d.push(d[i-1]+g*L);
}
const sLast=STMAX, Llast=sLast-(nP-1)*PVI_STEP;
let gLast=(egAt(sLast)-d[nP-1])/(Llast||1);
if (Math.abs(gLast)<MIN_S) gLast=(gLast>=0?1:-1)*MIN_S;
if (Math.abs(gLast)>MAX_S) gLast=(gLast>=0?1:-1)*MAX_S;
const designAt=st=>{
  const i=Math.min(nP-1,Math.floor(st/PVI_STEP)), s0=i*PVI_STEP;
  const g=i<nP-1?(d[i+1]-d[i])/PVI_STEP:gLast;
  return d[i]+g*(st-s0);
};

// ============ SVG 1: longitudinal profile ============
const W=730, H=330, L=52, R=12, T=14, B=30;
const pw=W-L-R, ph=H-T-B;
const eMin=92.8, eMax=101.2;
const px=s=>L+(s/STMAX)*pw;
const py=e=>T+(eMax-e)/(eMax-eMin)*ph;
const egPath=[], dgPath=[];
for (let s=0;s<=STMAX;s+=10){ egPath.push(px(s).toFixed(1)+','+py(egAt(s)).toFixed(1)); dgPath.push(px(s).toFixed(1)+','+py(designAt(s)).toFixed(1)); }
// fill polygons between lines
let fills='';
for (let s=0;s<STMAX;s+=10){
  const diff=designAt(s)-egAt(s);
  const s2=Math.min(s+10,STMAX);
  const diff2=designAt(s2)-egAt(s2);
  const col=diff>=0?'#dbeafe':'#fed7aa'; // پرکردگی آبی، برش نارنجی
  if ((diff>=0)===(diff2>=0) && Math.abs(diff)>0.01){
    fills+=`<polygon points="${px(s).toFixed(1)},${py(egAt(s)).toFixed(1)} ${px(s2).toFixed(1)},${py(egAt(s2)).toFixed(1)} ${px(s2).toFixed(1)},${py(designAt(s2)).toFixed(1)} ${px(s).toFixed(1)},${py(designAt(s)).toFixed(1)}" fill="${col}" fill-opacity="0.75"/>`;
  }
}
let grid='';
for (let e=93;e<=101;e+=1) grid+=`<line x1="${L}" y1="${py(e).toFixed(1)}" x2="${W-R}" y2="${py(e).toFixed(1)}" stroke="#e3e9ef" stroke-width="0.5"/><text x="${L-4}" y="${(py(e)+3).toFixed(1)}" font-size="8" fill="#5b6b7b" text-anchor="end">${e}</text>`;
for (let s=0;s<=STMAX;s+=100) grid+=`<line x1="${px(s).toFixed(1)}" y1="${T}" x2="${px(s).toFixed(1)}" y2="${T+ph}" stroke="#eef1f5" stroke-width="0.5"/><text x="${px(s).toFixed(1)}" y="${H-16}" font-size="7.5" fill="#5b6b7b" text-anchor="middle">${(s/1000).toFixed(1)}k</text>`;
const svgProfile=`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;direction:ltr">
${grid}${fills}
<polyline points="${egPath.join(' ')}" fill="none" stroke="#16a34a" stroke-width="1.6"/>
<polyline points="${dgPath.join(' ')}" fill="none" stroke="#dc2626" stroke-width="2"/>
<line x1="${L}" y1="${T+ph}" x2="${W-R}" y2="${T+ph}" stroke="#94a3b8" stroke-width="0.8"/>
<text x="${L}" y="${H-4}" font-size="8" fill="#5b6b7b">۰+۰۰۰</text>
<text x="${W-R}" y="${H-4}" font-size="8" fill="#5b6b7b" text-anchor="end">۰+۱۴۹۰</text>
<text x="${W/2}" y="${H-4}" font-size="8.5" fill="#334155" text-anchor="middle">طول مسیر (متر)</text>
</svg>`;

// ============ SVG 2: cut/fill depth bars ============
const W2=730,H2=150,L2=52,R2=12,T2=10,B2=24,pw2=W2-L2-R2,ph2=H2-T2-B2;
const zy=T2+ph2/2;
const px2=s=>L2+(s/STMAX)*pw2;
const py2=dep=>zy-(dep/0.5)*(ph2/2); // ±50cm
let bars='';
for (let s=0;s<STMAX;s+=20){
  const dep=designAt(s)-egAt(s);
  const y1=py2(Math.max(-0.5,Math.min(0.5,dep))), y0=zy;
  bars+=`<rect x="${(px2(s)-3).toFixed(1)}" y="${Math.min(y0,y1).toFixed(1)}" width="6" height="${Math.max(0.8,Math.abs(y0-y1)).toFixed(1)}" fill="${dep>=0?'#3b82f6':'#f97316'}"/>`;
}
let g2=`<line x1="${L2}" y1="${zy}" x2="${W2-R2}" y2="${zy}" stroke="#334155" stroke-width="1"/>`;
for (const dv of [-0.4,-0.2,0.2,0.4]) g2+=`<line x1="${L2}" y1="${py2(dv).toFixed(1)}" x2="${W2-R2}" y2="${py2(dv).toFixed(1)}" stroke="#eef1f5" stroke-width="0.5"/><text x="${L2-4}" y="${(py2(dv)+3).toFixed(1)}" font-size="8" fill="#5b6b7b" text-anchor="end">${dv>0?'+':''}${dv}</text>`;
for (let s=0;s<=STMAX;s+=250) g2+=`<text x="${px2(s).toFixed(1)}" y="${H2-8}" font-size="7.5" fill="#5b6b7b" text-anchor="middle">${(s/1000).toFixed(2)}k</text>`;
const svgCut=`<svg viewBox="0 0 ${W2} ${H2}" xmlns="http://www.w3.org/2000/svg" style="width:100%;direction:ltr">${g2}${bars}
<text x="${W2/2}" y="${H2-1}" font-size="8" fill="#334155" text-anchor="middle">اختلاف طرح منهای زمین (متر) — آبی: پرکردگی / نارنجی: برش</text></svg>`;

// ============ SVG 3: curb cross-section schematic ============
const svgSec=`<svg viewBox="0 0 730 210" xmlns="http://www.w3.org/2000/svg" style="width:100%;direction:ltr">
<defs><pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#fef3c7"/><line x1="0" y1="0" x2="0" y2="6" stroke="#d4a017" stroke-width="1"/></pattern></defs>
<!-- سطوح -->
<polygon points="40,120 360,120 380,150 40,150" fill="url(#hatch)" stroke="#92400e" stroke-width="1"/>
<polygon points="380,150 700,150 700,170 380,170" fill="#e2e8f0" stroke="#64748b" stroke-width="1"/>
<polygon points="40,120 20,60 40,60 60,120" fill="#cbd5e1" stroke="#475569" stroke-width="1"/>
<!-- جدول -->
<rect x="355" y="85" width="20" height="35" fill="#94a3b8" stroke="#334155" stroke-width="1.5"/>
<rect x="355" y="120" width="20" height="30" fill="#cbd5e1" stroke="#334155" stroke-width="1.5"/>
<!-- جوی -->
<polygon points="380,150 420,150 415,168 385,168" fill="#bae6fd" stroke="#0369a1" stroke-width="1"/>
<!-- برچسب‌ها -->
<text x="365" y="78" font-size="11" fill="#0f172a" text-anchor="middle" font-weight="bold">جدول ۲۰×۳۰</text>
<text x="365" y="66" font-size="9" fill="#5b6b7b" text-anchor="middle">۱۵ سانت بیرون‌زدگی</text>
<text x="400" y="185" font-size="10" fill="#0369a1" text-anchor="middle">جوی ۳۰×۴۰</text>
<text x="470" y="163" font-size="10" fill="#334155">بستر مگر ۵ سانت زیر جدول</text>
<text x="540" y="138" font-size="10" fill="#334155">شیب عرضی ۲٪ به سمت جوی</text>
<line x1="380" y1="122" x2="690" y2="115" stroke="#dc2626" stroke-width="1" stroke-dasharray="5,3"/>
<text x="600" y="108" font-size="9" fill="#dc2626">تراز روی جدول = خط طرح + ۱۵~۲۰ سانت</text>
<line x1="380" y1="168" x2="690" y2="178" stroke="#0369a1" stroke-width="1" stroke-dasharray="5,3"/>
<text x="600" y="195" font-size="9" fill="#0369a1">کف جوی = خط طرح − ۳۰ سانت</text>
<text x="120" y="105" font-size="10" fill="#334155">سطح خیابان</text>
<text x="30" y="50" font-size="10" fill="#334155">جدولِ برعکس سمت دیگر (آینه‌ای)</text>
</svg>`;

// ============ data tables ============
const fa = n => n.toLocaleString('fa-IR',{maximumFractionDigits:2});
let slopeRows='';
for (let s=0;s+100<=STMAX;s+=100){
  const g=((egAt(s+100)-egAt(s))/100)*100;
  slopeRows+=`<tr><td class="num">۰+${String(s).padStart(3,'0')} → ۰+${String(s+100).padStart(3,'0')}</td><td class="num">${(g>=0?'+':'')+g.toFixed(2)}٪</td><td>${Math.abs(g)<0.3?'<b>کم‌شیب — نیاز به اصلاح تراز</b>':'مناسب'}</td></tr>`;
}
let cut=0, fill=0; const win=[];
for (let s=0;s<STMAX;s+=20){ const diff=designAt(s)-egAt(s); win.push({s,diff}); if(diff<0)cut+=(-diff)*20*WIDTH; else fill+=diff*20*WIDTH; }
let cfRows='';
for (let i=0;i<win.length;i+=5){
  const grp=win.slice(i,i+5); if(!grp.length)break;
  const avg=grp.reduce((a,o)=>a+o.diff,0)/grp.length;
  const hasCut=grp.some(o=>o.diff<-0.05), hasFill=grp.some(o=>o.diff>0.05);
  const t=!hasCut&&!hasFill?'مماس':hasCut&&hasFill?'مخلوط':hasCut?'برش':'پرکردگی';
  const vol=Math.abs(avg)*WIDTH*(grp[grp.length-1].s+20-grp[0].s);
  cfRows+=`<tr><td class="num">۰+${String(grp[0].s).padStart(3,'0')} – ۰+${String(grp[grp.length-1].s+20).padStart(3,'0')}</td><td class="num">${(avg>=0?'+':'')+avg.toFixed(2)} م</td><td>${t}</td><td class="num">≈ ${fa(vol)}</td></tr>`;
}
let pviRows='';
for (let i=0;i<nP;i++){
  const g=i<nP-1?((d[i+1]-d[i])/PVI_STEP)*100:gLast*100;
  pviRows+=`<tr><td class="num">۰+${String(i*PVI_STEP).padStart(3,'0')}</td><td class="num">${d[i].toFixed(2)}</td><td class="num">${g.toFixed(2)}٪</td></tr>`;
}
const trench=2*STMAX*TRENCH_W*TRENCH_D;
const data={svgProfile,svgCut,svgSec,slopeRows,cfRows,pviRows,cut,fill,trench,nP,d,gLast,STMAX,WIDTH};
fs.writeFileSync('profil-pdf-data.json', JSON.stringify(data));
console.log('data ready: cut='+cut.toFixed(0)+' fill='+fill.toFixed(0)+' trench='+trench.toFixed(0));
