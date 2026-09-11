// Clean chain builder: ordered walk from seed, forward then backward, longest-first
import fs from 'fs';

const j=JSON.parse(fs.readFileSync('all-ways.json','utf8'));
const ways=(j.elements||[]).filter(e=>e.geometry&&e.geometry.length>1);
function wayLen(g){const K=Math.cos(g[0].lat*Math.PI/180);let s=0;for(let i=1;i<g.length;i++)s+=Math.hypot((g[i].lon-g[i-1].lon)*111320*K,(g[i].lat-g[i-1].lat)*110540);return s;}
const d=(p,q)=>Math.hypot((p.lat-q.lat)*110540,(p.lon-q.lon)*111320*Math.cos(p.lat*Math.PI/180));
const seed=ways.find(w=>w.id===312530971);
const used=new Set([seed.id]);
let path=[...seed.geometry];

// forward: extend tail
for(let guard=0;guard<20;guard++){
  const tail=path[path.length-1];
  let best=null;
  for (const w of ways){
    if (used.has(w.id)) continue;
    const L=wayLen(w.geometry);
    if (L>2500) continue;
    const a=w.geometry[0], b=w.geometry[w.geometry.length-1];
    let gl=null;
    if (d(tail,a)<25) gl=w.geometry;
    else if (d(tail,b)<25) gl=[...w.geometry].reverse();
    if (gl && (!best || L>best.L)) best={gl,L,id:w.id,name:w.tags?.name||'?'};
  }
  if(!best) break;
  path=path.concat(best.gl.slice(1));
  used.add(best.id);
  console.log('fwd +', best.id, best.name, Math.round(best.L)+'m');
}
// backward: extend head
for(let guard=0;guard<20;guard++){
  const head=path[0];
  let best=null;
  for (const w of ways){
    if (used.has(w.id)) continue;
    const L=wayLen(w.geometry);
    if (L>2500) continue;
    const a=w.geometry[0], b=w.geometry[w.geometry.length-1];
    let gl=null;
    if (d(head,a)<25) gl=w.geometry;
    else if (d(head,b)<25) gl=[...w.geometry].reverse();
    if (gl && (!best || L>best.L)) best={gl,L,id:w.id,name:w.tags?.name||'?'};
  }
  if(!best) break;
  path=best.gl.slice(0,-1).concat(path);
  used.add(best.id);
  console.log('bwd +', best.id, best.name, Math.round(best.L)+'m');
}
const K=Math.cos(path[0].lat*Math.PI/180);
let big=0,total=0;
for(let i=1;i<path.length;i++){
  const dd=Math.hypot((path[i].lon-path[i-1].lon)*111320*K,(path[i].lat-path[i-1].lat)*110540);
  total+=dd; if(dd>150) big++;
}
console.log('chain total='+Math.round(total)+'m pts='+path.length+' jumps='+big);
fs.writeFileSync('niasari-chain.json', JSON.stringify(path));
console.log('saved niasari-chain.json');
