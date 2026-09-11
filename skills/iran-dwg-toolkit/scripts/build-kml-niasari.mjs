// Build KML + Leaflet preview from the refined Niasari-chain fit
import fs from 'fs';

const fit = JSON.parse(fs.readFileSync('niasari-fit.json','utf8'));
const {th, p0, d0, lat0, lon0} = fit;
const K = Math.cos(lat0*Math.PI/180);
const c = Math.cos(th), sn = Math.sin(th);
const toLL = (x,y)=>{
  const qx = p0[0] + ((x-d0[0])*c - (y-d0[1])*sn);
  const qy = p0[1] + ((x-d0[0])*sn + (y-d0[1])*c);
  return [lat0 + qy/110540, lon0 + qx/(111320*K)];
};

const rows = fs.readFileSync('entities.tsv','utf8').split(/\r?\n/).filter(Boolean);
rows.shift();
const ents = rows.map(l=>l.split('\t')).map(c=>({space:c[0],type:c[1],layer:c[2],info:c[3]||'',geom:c[4]||''}));
const ptsOf = g => g.split(';').filter(s=>s&&s!=='C'&&s!=='O'&&s!=='CLASSIC')
  .map(s=>s.split(',').map(Number)).filter(p=>p.length>=2&&isFinite(p[0])&&isFinite(p[1]));

const center = ents.filter(e=>e.layer==='C-ROAD'&&e.type==='LWPOLYLINE')
  .map(r=>ptsOf(r.geom)).sort((a,b)=>b.length-a.length)[0].map(p=>toLL(p[0],p[1]));
const curbs = ents.filter(e=>e.layer==='Curb'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const hads = ents.filter(e=>e.layer==='HAD'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const walls = ents.filter(e=>e.layer==='Wall'&&(e.type==='LWPOLYLINE'||e.type==='POLYLINE')).map(r=>ptsOf(r.geom).map(p=>toLL(p[0],p[1])));
const vnodes = ents.filter(e=>e.layer==='V-NODE'&&e.type==='INSERT').map(e=>{const p=e.geom.split(';')[0].split(',').map(Number);return toLL(p[0],p[1]);});

const coordStr = pts=>pts.map(p=>p[1].toFixed(7)+','+p[0].toFixed(7)).join(' ');
const ls=(name,pts,color,width)=>`<Placemark><name>${name}</name><Style><LineStyle><color>${color}</color><width>${width}</width></LineStyle></Style><LineString><tessellate>1</tessellate><coordinates>${coordStr(pts)}</coordinates></LineString></Placemark>`;

let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>جدول‌گذاری نیاسری ماهدشت (از DWG)</name>
<Folder><name>محور خیابان</name>${ls('محور ۰+۰۰۰ تا ۱+۴۶۵', center, 'ff0000ff', 4)}</Folder>
<Folder><name>جدول‌ها (لایه Curb)</name>${curbs.map((cb,i)=>ls('جدول قطعه '+(i+1), cb, 'ff00a5ff', 3)).join('')}</Folder>
<Folder><name>حدود ملکی</name>${hads.map((h,i)=>ls('حد '+(i+1), h, 'ff008b8b', 1)).join('')}</Folder>
<Folder><name>دیوارها</name>${walls.map((h,i)=>ls('دیوار '+(i+1), h, 'ff9a9a9a', 1)).join('')}</Folder>
<Folder><name>نقاط برداشت توپو (${vnodes.length})</name>${vnodes.map(v=>`<Placemark><Style><IconStyle><color>ff20b2aa</color><scale>0.5</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/placemark_circle.png</href></Icon></IconStyle><Point><coordinates>${v[1].toFixed(7)},${v[0].toFixed(7)}</coordinates></Point></Placemark>`).join('')}</Folder>
</Document></kml>`;
fs.writeFileSync('niasari-mahdasht.kml', kml, 'utf8');
console.log('KML: ' + Math.round(kml.length/1024) + ' KB');

const gj = {type:'FeatureCollection',features:[
  {type:'Feature',properties:{n:'محور خیابان',k:'c'},geometry:{type:'LineString',coordinates:center.map(p=>[p[1],p[0]])}},
  ...curbs.map((cb,i)=>({type:'Feature',properties:{n:'جدول '+(i+1),k:'b'},geometry:{type:'LineString',coordinates:cb.map(p=>[p[1],p[0]])}})),
  ...hads.map((h,i)=>({type:'Feature',properties:{n:'حد '+(i+1),k:'h'},geometry:{type:'LineString',coordinates:h.map(p=>[p[1],p[0]])}})),
  ...walls.map((h,i)=>({type:'Feature',properties:{n:'دیوار '+(i+1),k:'w'},geometry:{type:'LineString',coordinates:h.map(p=>[p[1],p[0]])}})),
]};
const lats=[...center.map(p=>p[0]),...curbs.flat().map(p=>p[0])], lons=[...center.map(p=>p[1]),...curbs.flat().map(p=>p[1])];
const html=`<!DOCTYPE html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><title>پیش‌نمایش — نقشهٔ نیاسری ماهدشت روی نقشهٔ واقعی</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>body{margin:0;font-family:Tahoma,sans-serif}#map{position:fixed;inset:0}#bar{position:fixed;top:8px;right:8px;z-index:999;background:#fff;padding:8px 14px;border-radius:8px;box-shadow:0 2px 8px #0003;font-size:13px;line-height:1.9}</style></head>
<body><div id="bar"><b>پیش‌نمایش ژئورفرنس DWG روی نقشهٔ واقعی</b><br>🔴 محور خیابان · 🟠 جدول‌ها · نقطه‌های سبز: برداشت توپو<br>اگر جابه‌جاست: در گوگل‌مپ روی ابتدا و انتهای خیابان راست‌کلیک کن و مختصات دو نقطه را بفرست</div><div id="map"></div>
<script>
const map=L.map('map');
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20}).addTo(map);
const style=f=>f.properties.k==='c'?{color:'#ff0000',weight:6}:f.properties.k==='b'?{color:'#ff8c00',weight:5}:f.properties.k==='h'?{color:'#008b8b',weight:2}:{color:'#999',weight:2};
L.geoJSON(${JSON.stringify(gj)},{style}).bindPopup(l=>l.feature.properties.n).addTo(map);
L.geoJSON(${JSON.stringify({type:'FeatureCollection',features:vnodes.map(v=>({type:'Feature',geometry:{type:'Point',coordinates:[v[1],v[0]]}}))})},{pointToLayer:(f,l)=>L.circleMarker(l,{radius:2,color:'#0e7a6f',fillOpacity:.8})}).addTo(map);
map.fitBounds([[${Math.min(...lats)},${Math.min(...lons)}],[${Math.max(...lats)},${Math.max(...lons)}]]);
</script></body></html>`;
fs.writeFileSync('niasari-preview.html', html, 'utf8');
console.log('preview HTML written');
console.log('center start (0+000):', center[0][0].toFixed(5)+','+center[0][1].toFixed(5));
console.log('center end   (1+465):', center[center.length-1][0].toFixed(5)+','+center[center.length-1][1].toFixed(5));
