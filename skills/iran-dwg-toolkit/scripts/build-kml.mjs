// Build Google Earth KML + Leaflet preview from 2 tie points (station 0+000 and 1+500 of the centerline)
// Usage: node build-kml.mjs ties.json   where ties.json = {"start":[lat,lon],"end":[lat,lon]}
import fs from 'fs';

const ties = JSON.parse(fs.readFileSync(process.argv[2] || 'ties.json','utf8'));
const rows = fs.readFileSync('entities.tsv','utf8').split(/\r?\n/).filter(Boolean);
rows.shift();
const ents = rows.map(l=>l.split('\t')).map(c=>({space:c[0],type:c[1],layer:c[2],info:c[3]||'',geom:c[4]||''}));
const ptsOf = g => g.split(';').filter(s=>s&&s!=='C'&&s!=='O'&&s!=='CLASSIC')
  .map(s=>s.split(',').map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1]));

const draw = ents.filter(e=>e.layer==='C-ROAD'&&e.type==='LWPOLYLINE')
  .map(r=>ptsOf(r.geom)).sort((a,b)=>b.length-a.length)[0];
const d0 = draw[0], d1 = draw[draw.length-1];

// similarity transform (rotation + uniform scale + translation) mapping d0->start, d1->end
const [latS,lonS] = ties.start, [latE,lonE] = ties.end;
const K = Math.cos(((latS+latE)/2)*Math.PI/180);
const sx = (lonS-lonE)*111320*K, sy = (latS-latE)*110540;   // real-world start-end vector (m)
const dx = d1[0]-d0[0], dy = d1[1]-d0[1];                     // drawing start-end vector (m)
const th = Math.atan2(sy,sx) - Math.atan2(dy,dx);
const sc  = Math.hypot(sx,sy)/Math.hypot(dx,dy);
console.log('rotation=' + (th*180/Math.PI).toFixed(2) + '°  scale=' + sc.toFixed(4));
const c=Math.cos(th), sn=Math.sin(th);
const toLL = (x,y)=>{
  const px=(x-d0[0])*sc, py=(y-d0[1])*sc;
  const qx = px*c - py*sn, qy = px*sn + py*c;
  const lat = latS + qy/110540, lon = lonS + qx/(111320*K);
  return [lat,lon];
};

const pl = (pts)=>pts.map(p=>p[1].toFixed(7)+','+p[0].toFixed(7)).join(' ');
const center = draw.map(p=>toLL(p[0],p[1]));
const curbs = ents.filter(e=>e.layer==='Curb'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const hads = ents.filter(e=>e.layer==='HAD'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const walls = ents.filter(e=>e.layer==='Wall'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const vnodes = ents.filter(e=>e.layer==='V-NODE'&&e.type==='INSERT').map(e=>{const p=e.geom.split(';')[0].split(',').map(Number);return toLL(p[0],p[1]);});

const ls = (name,pts,color,width)=>`
    <Placemark><name>${name}</name><Style><LineStyle><color>${color}</color><width>${width}</width></LineStyle></Style><LineString><tessellate>1</tessellate><coordinates>${pl(pts)}</coordinates></LineString></Placemark>`;

let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>جدول‌گذاری ایثار ماهدشت</name>
  <Folder><name>محور خیابان (از نقشه)` + ls('محور ۰+۰۰۰ تا ۱+۵۰۰', center, 'ff0000ff', 4);
for (let i=0;i<curbs.length;i++) kml += ls('جدول '+(i+1), curbs[i], 'ff00a5ff', 3);
kml += `</Folder>
  <Folder><name>حدود ملکی` + hads.map((h,i)=>ls('حد '+(i+1), h, 'ff8b8000', 1)).join('');
kml += `</Folder>
  <Folder><name>دیوارها` + walls.map((h,i)=>ls('دیوار '+(i+1), h, 'ff808080', 1)).join('');
kml += `</Folder>
  <Folder><name>نقاط برداشت توپو (${vnodes.length})`;
for (const v of vnodes) kml += `<Placemark><Style><IconStyle><color>ff20b2aa</color><scale>0.5</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle><Point><coordinates>${v[1].toFixed(7)},${v[0].toFixed(7)}</coordinates></Point></Placemark>`;
kml += `</Folder>
</Document></kml>`;
fs.writeFileSync('eisar-mahdasht.kml', kml, 'utf8');
console.log('KML written: eisar-mahdasht.kml (' + Math.round(kml.length/1024) + ' KB)');

// Leaflet preview
const gj = {type:'FeatureCollection',features:[
  {type:'Feature',properties:{n:'محور خیابان'},geometry:{type:'LineString',coordinates:center.map(p=>[p[1],p[0]])}},
  ...curbs.map((cb,i)=>({type:'Feature',properties:{n:'جدول '+(i+1)},geometry:{type:'LineString',coordinates:cb.map(p=>[p[1],p[0]])}})),
  ...hads.map((h,i)=>({type:'Feature',properties:{n:'حد '+(i+1)},geometry:{type:'LineString',coordinates:h.map(p=>[p[1],p[0]])}})),
  ...walls.map((h,i)=>({type:'Feature',properties:{n:'دیوار '+(i+1)},geometry:{type:'LineString',coordinates:h.map(p=>[p[1],p[0]])}})),
]};
const ptsGJ = {type:'FeatureCollection',features:vnodes.map(v=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[v[1],v[0]]}}))};
const allLL = [...center, ...curbs.flat()];
const lats = allLL.map(p=>p[0]), lons = allLL.map(p=>p[1]);
const html = `<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>پیش‌نمایش نقشهٔ ایثار ماهدشت روی نقشهٔ واقعی</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0;font-family:Tahoma}#map{position:fixed;inset:0}#bar{position:fixed;top:8px;right:8px;z-index:999;background:#fff;padding:8px 14px;border-radius:8px;box-shadow:0 2px 8px #0003;font-size:13px}</style></head>
<body><div id="bar">خط قرمز: محور خیابان · خط نارنجی: جدول‌ها · سبز: نقاط برداشت — <b id="w"></b></div><div id="map"></div>
<script>
const map=L.map('map');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20}).addTo(map);
const gj=${JSON.stringify(gj)};
L.geoJSON(gj,{style:f=>f.properties.n==='محور خیابان'?{color:'#ff0000',weight:5}:{color:'#ff8c00',weight:4}}).addTo(map).bindPopup(l=>l.feature.properties.n);
L.geoJSON(${JSON.stringify(ptsGJ)},{pointToLayer:(f,l)=>L.circleMarker(l,{radius:2,color:'#0e7a6f',fillOpacity:.8})}).addTo(map);
map.fitBounds([[${Math.min(...lats)},${Math.min(...lons)}],[${Math.max(...lats)},${Math.max(...lons)}]]);
document.getElementById('w').textContent='مقیاس تبدیل: ${sc.toFixed(4)}';
</script></body></html>`;
fs.writeFileSync('eisar-preview.html', html, 'utf8');
console.log('preview written: eisar-preview.html');
