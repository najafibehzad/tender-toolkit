// Geo-fit: rigidly align drawing centerline (local meters) onto OSM خیابان ایثار way
// Model: rotation + translation only (scale locked to 1 — drawing is in real meters)
// Search: anchor arclength s0 along OSM way × direction (fwd/rev), refine by RMS
import fs from 'fs';

const rows = fs.readFileSync('entities.tsv','utf8').split(/\r?\n/).filter(Boolean);
rows.shift();
const ents = rows.map(l=>l.split('\t')).map(c=>({space:c[0],type:c[1],layer:c[2],info:c[3]||'',geom:c[4]||''}));
const ptsOf = g => g.split(';').filter(s=>s&&s!=='C'&&s!=='O'&&s!=='CLASSIC')
  .map(s=>s.split(',').map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1]));

// ---- drawing centerline (longest C-ROAD polyline) ----
const roads = ents.filter(e=>e.layer==='C-ROAD'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE'))
  .map(r=>ptsOf(r.geom)).sort((a,b)=>b.length-a.length);
const draw = roads[0];
const drawLen = draw.reduce((a,p,i)=>i?a+Math.hypot(p[0]-draw[i-1][0],p[1]-draw[i-1][1]):0,0);

// ---- OSM way ----
const osm = JSON.parse(fs.readFileSync('eisar-osm.json','utf8')).elements
  .sort((a,b)=>(b.geometry||[]).length-(a.geometry||[]).length)[0];
const lat0 = osm.geometry[0].lat, lon0 = osm.geometry[0].lon, K = Math.cos(lat0*Math.PI/180);
const toXY = (lat,lon)=>[(lon-lon0)*111320*K, (lat-lat0)*110540];
const osmXY = osm.geometry.map(p=>toXY(p.lat,p.lon));
const osmLen = osmXY.reduce((a,p,i)=>i?a+Math.hypot(p[0]-osmXY[i-1][0],p[1]-osmXY[i-1][1]):0,0);

// ---- resample helpers ----
function resample(path, step){
  const out=[]; let acc=0; out.push(path[0].slice());
  for(let i=1;i<path.length;i++){
    let a=path[i-1], b=path[i];
    let d=Math.hypot(b[0]-a[0],b[1]-a[1]);
    while(acc+d>=step){ const t=(step-acc)/d; a=[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; out.push(a.slice()); d=Math.hypot(b[0]-a[0],b[1]-a[1]); acc=0; }
    acc+=d;
  }
  out.push(path[path.length-1].slice());
  return out;
}
function pointAt(path, s){ // path = dense resample, s = arclength
  const i = Math.min(path.length-2, Math.max(0, Math.floor(s/RES)));
  const t = (s - i*RES)/RES;
  const a=path[i], b=path[i+1];
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
}
const RES = 2;
const drawR = resample(draw, RES);
const osmR  = resample(osmXY, RES);

function tangentAt(path, s){
  const a=pointAt(path, Math.max(0,s-5)), b=pointAt(path, Math.min(path.length*RES-0.01, s+5));
  return Math.atan2(b[1]-a[1], b[0]-a[0]);
}
function distToPolyline(pt, path){
  let best=Infinity;
  for(let i=0;i<path.length-1;i++){
    const a=path[i], b=path[i+1];
    const dx=b[0]-a[0], dy=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((pt[0]-a[0])*dx+(pt[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
    const d=Math.hypot(pt[0]-(a[0]+t*dx), pt[1]-(a[1]+t*dy));
    if(d<best) best=d;
  }
  return best;
}

const drawSamp = resample(draw, 25); // RMS sampling
let best=null;
for (const rev of [false,true]){
  const dp = rev ? [...drawR].reverse() : drawR;
  const ds = rev ? [...drawSamp].reverse() : drawSamp;
  const d0 = dp[0]; // drawing start anchor (subtract before rotate!)
  const slack = Math.max(0, osmLen - drawLen);
  for (let s0=0; s0<=slack; s0+=5){
    const p0 = pointAt(osmR, s0);
    const th = tangentAt(osmR, s0+Math.min(50,drawLen/2)) - tangentAt(dp, Math.min(50,drawLen/2));
    const c=Math.cos(th), sn=Math.sin(th);
    // transform drawing samples, RMS to OSM
    let sum=0, n=0;
    for (const p of ds){
      const q=[p0[0] + ((p[0]-d0[0])*c - (p[1]-d0[1])*sn), p0[1] + ((p[0]-d0[0])*sn + (p[1]-d0[1])*c)];
      sum += distToPolyline(q, osmR)**2; n++;
    }
    const rms = Math.sqrt(sum/n);
    if (!best || rms < best.rms) best = {rms, s0, rev, th, p0, d0};
  }
}
console.log('drawLen=', drawLen.toFixed(1), 'osmLen=', osmLen.toFixed(1));
console.log('BEST:', JSON.stringify({rms_m: +best.rms.toFixed(2), s0: best.s0, reversed: best.rev, rot_deg: +(best.th*180/Math.PI).toFixed(2)}));

// final transform of ALL drawing coords: draw → geo-local → lat/lon
const {th, p0} = best;
const c=Math.cos(th), sn=Math.sin(th);
const toLL = (x,y)=>{
  const qx = p0[0] + x*c - y*sn, qy = p0[1] + x*sn + y*c;
  return [lat0 + qy/110540, lon0 + qx/(111320*K)];
};
// transformed curb polylines
const curbs = ents.filter(e=>e.layer==='Curb'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const center = draw.map(p=>toLL(p[0],p[1]));
const hads = ents.filter(e=>e.layer==='HAD'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const vnodes = ents.filter(e=>e.layer==='V-NODE'&&e.type==='INSERT').map(e=>{const p=e.geom.split(';')[0].split(',').map(Number);return toLL(p[0],p[1]);});
console.log('curbs:',curbs.length,'center pts:',center.length,'had:',hads.length,'vnodes:',vnodes.length);

// curb zone RMS sanity: distance of curb midpoints to OSM path
const curbLL = curbs.flat();
const curbXY = curbLL.map(p=>toXY(p[0],p[1]));
const dR = resample(osmXY, 5);
let dmax=0, dsum=0;
for (const p of curbXY){ const d=distToPolyline(p,dR); dsum+=d; dmax=Math.max(dmax,d); }
console.log('curb dist to OSM street: avg='+(dsum/curbXY.length).toFixed(1)+'m max='+dmax.toFixed(1)+'m');

fs.writeFileSync('geo-fit.json', JSON.stringify({best, center, curbs, hads, vnodes, meta:{drawLen, osmLen, wayId: osm.id, lat0, lon0}}));
console.log('saved geo-fit.json');
