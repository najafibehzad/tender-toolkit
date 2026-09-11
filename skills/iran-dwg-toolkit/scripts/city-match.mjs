// City-wide match: fit drawing centerline rigidly onto EVERY OSM highway >= ~1200m, rank by RMS
import fs from 'fs';

const rows = fs.readFileSync('entities.tsv','utf8').split(/\r?\n/).filter(Boolean);
rows.shift();
const ents = rows.map(l=>l.split('\t')).map(c=>({space:c[0],type:c[1],layer:c[2],info:c[3]||'',geom:c[4]||''}));
const ptsOf = g => g.split(';').filter(s=>s&&s!=='C'&&s!=='O'&&s!=='CLASSIC')
  .map(s=>s.split(',').map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1]));
const draw = ents.filter(e=>e.layer==='C-ROAD'&&e.type==='LWPOLYLINE')
  .map(r=>ptsOf(r.geom)).sort((a,b)=>b.length-a.length)[0];
const drawLen = draw.reduce((a,p,i)=>i?a+Math.hypot(p[0]-draw[i-1][0],p[1]-draw[i-1][1]):0,0);

function resample(path, step){
  const out=[path[0].slice()]; let acc=0;
  for(let i=1;i<path.length;i++){
    let a=path[i-1], b=path[i];
    let d=Math.hypot(b[0]-a[0],b[1]-a[1]);
    while(acc+d>=step){ const t=(step-acc)/d; a=[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t]; out.push(a.slice()); d=Math.hypot(b[0]-a[0],b[1]-a[1]); acc=0; }
    acc+=d;
  }
  out.push(path[path.length-1].slice());
  return out;
}
const RES=5;
const drawR = resample(draw,RES);
const drawSamp = resample(draw,30);

function fitWay(geom){
  const lat0=geom[0].lat, lon0=geom[0].lon, K=Math.cos(lat0*Math.PI/180);
  const osmXY=geom.map(p=>[(p.lon-lon0)*111320*K,(p.lat-lat0)*110540]);
  const osmLen=osmXY.reduce((a,p,i)=>i?a+Math.hypot(p[0]-osmXY[i-1][0],p[1]-osmXY[i-1][1]):0,0);
  if (osmLen < drawLen*0.98) return null; // must be at least as long (rigid, scale=1)
  const osmR=resample(osmXY,RES);
  const pointAt=(path,s)=>{
    const i=Math.min(path.length-2,Math.max(0,Math.floor(s/RES)));
    const t=(s-i*RES)/RES; const a=path[i],b=path[i+1];
    return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
  };
  const tangentAt=(path,s)=>{
    const a=pointAt(path,Math.max(0,s-8)), b=pointAt(path,Math.min(path.length*RES-0.01,s+8));
    return Math.atan2(b[1]-a[1],b[0]-a[0]);
  };
  const dist=(pt)=>{
    let best=Infinity;
    for(let i=0;i<osmR.length-1;i++){
      const a=osmR[i],b=osmR[i+1], dx=b[0]-a[0],dy=b[1]-a[1];
      const t=Math.max(0,Math.min(1,((pt[0]-a[0])*dx+(pt[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
      const d=Math.hypot(pt[0]-(a[0]+t*dx),pt[1]-(a[1]+t*dy));
      if(d<best)best=d;
    }
    return best;
  };
  let best=null;
  for (const rev of [false,true]){
    const dp=rev?[...drawR].reverse():drawR;
    const ds=rev?[...drawSamp].reverse():drawSamp;
    const d0=dp[0];
    const slack=osmLen-drawLen;
    // coarse: s0 step 20, angle around tangent guess ±12° step 3°
    for (let s0=0;s0<=slack+0.01;s0+=20){
      const base=tangentAt(osmR,Math.min(osmLen-1,s0+Math.min(60,drawLen/2)))-tangentAt(dp,Math.min(60,drawLen/2));
      for (let dth=-0.21;dth<=0.211;dth+=0.052){
        const th=base+dth, c=Math.cos(th),sn=Math.sin(th);
        const p0=pointAt(osmR,s0);
        let sum=0,n=0;
        for (const p of ds){
          const q=[p0[0]+((p[0]-d0[0])*c-(p[1]-d0[1])*sn), p0[1]+((p[0]-d0[0])*sn+(p[1]-d0[1])*c)];
          sum+=dist(q)**2;n++;
        }
        const rms=Math.sqrt(sum/n);
        if(!best||rms<best.rms) best={rms,s0,rev,th,p0,d0,lat0,lon0,K};
      }
    }
  }
  return best ? {...best, osmLen} : null;
}

const j=JSON.parse(fs.readFileSync('all-ways.json','utf8'));
const results=[];
for (const w of j.elements||[]){
  const g=w.geometry||[];
  if (g.length<2) continue;
  const lat0=g[0].lat,K=Math.cos(lat0*Math.PI/180);
  const L=g.reduce((a,p,i)=>i?a+Math.hypot((p.lon-g[i-1].lon)*111320*K,(p.lat-g[i-1].lat)*110540):0,0);
  if (L < drawLen*0.98) continue;
  const r=fitWay(g);
  if (r) results.push({rms:+r.rms.toFixed(1), name:w.tags?.name||'(بی‌نام)', highway:w.tags?.highway||'', len:Math.round(L), s0:Math.round(r.s0), rev:r.rev, rot:+(r.th*180/Math.PI).toFixed(1), wayId:w.id});
}
results.sort((a,b)=>a.rms-b.rms);
console.log('ways >= 98% of drawLen:', results.length);
for (const r of results.slice(0,10)) console.log('RMS='+r.rms+'m |', r.name,'|',r.highway,'| len='+r.len,'| s0='+r.s0,'| rev='+r.rev,'| rot='+r.rot+'° | way', r.wayId);
fs.writeFileSync('match-results.json', JSON.stringify(results.slice(0,10),null,1));
