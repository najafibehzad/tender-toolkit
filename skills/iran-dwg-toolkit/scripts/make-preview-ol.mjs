// Final preview: OpenLayers + official Neshan SDK base + Google/Bing/MapIr/OSM bases + DWG overlays
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

const gj = {type:'FeatureCollection',features:[
  ...curbs.map((cb,i)=>({type:'Feature',properties:{n:'جدول '+(i+1),k:'b'},geometry:{type:'LineString',coordinates:cb.map(p=>[p[1],p[0]])}})),
  {type:'Feature',properties:{n:'محور خیابان',k:'c'},geometry:{type:'LineString',coordinates:center.map(p=>[p[1],p[0]])}},
  ...hads.map((h,i)=>({type:'Feature',properties:{n:'حد '+(i+1),k:'h'},geometry:{type:'LineString',coordinates:h.map(p=>[p[1],p[0]])}})),
  ...walls.map((h,i)=>({type:'Feature',properties:{n:'دیوار '+(i+1),k:'w'},geometry:{type:'LineString',coordinates:h.map(p=>[p[1],p[0]])}})),
]};
const lats=[...center.map(p=>p[0]),...curbs.flat().map(p=>p[0])], lons=[...center.map(p=>p[1]),...curbs.flat().map(p=>p[1])];
const midLon=(Math.min(...lons)+Math.max(...lons))/2, midLat=(Math.min(...lats)+Math.max(...lats))/2;

const html=`<!DOCTYPE html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8">
<title>نقشهٔ نیاسری ماهدشت — DWG روی نقشهٔ واقعی</title>
<link rel="stylesheet" href="https://static.neshan.org/sdk/openlayers/5.3.0/ol.css">
<style>
body{margin:0;font-family:Tahoma,sans-serif}
#map{position:fixed;inset:0;background:#20303f}
#bar{position:fixed;top:10px;right:10px;z-index:100;background:#ffffffee;padding:10px 14px;border-radius:10px;box-shadow:0 2px 10px #0004;font-size:12.5px;line-height:2.1;max-width:290px}
#bar b{font-size:13.5px}
#bases{position:fixed;top:10px;left:10px;z-index:100;background:#ffffffee;border-radius:10px;box-shadow:0 2px 10px #0004;padding:6px 10px;font-size:12.5px}
#bases label{display:block;padding:4px 6px;cursor:pointer;border-radius:6px}
#bases label:hover{background:#0f766e18}
#tip{position:fixed;bottom:10px;right:10px;z-index:100;background:#fff7e8ee;border:1px solid #eeddb4;color:#92400e;border-radius:8px;padding:6px 12px;font-size:11.5px}
</style></head>
<body>
<div id="map"></div>
<div id="bar"><b>نقشهٔ ژئورفرنس‌شدهٔ پروژهٔ جدول‌گذاری نیاسری ماهدشت</b><br>
🟠 جدول‌ها (۳۶۸ متر) · 🔴 محور خیابان · آبی=حدود · سبز=نقاط برداشت</div>
<div id="bases">
<b>پایهٔ نقشه:</b>
<label><input type="radio" name="base" value="neshan" checked> نشان (فارسی)</label>
<label><input type="radio" name="base" value="ghyb"> ماهواره گوگل + نام‌ها</label>
<label><input type="radio" name="base" value="gsat"> ماهواره گوگل</label>
<label><input type="radio" name="base" value="bing"> ماهواره بینگ</label>
<label><input type="radio" name="base" value="mapir"> مپ‌ایر</label>
<label><input type="radio" name="base" value="osm"> OpenStreetMap</label>
</div>
<div id="tip">اگر جدول‌ها جابه‌جا بودند: مختصات دو سر خیابان را از گوگل‌مپ/نشان بفرست تا دقیق قفل شود</div>
<script src="https://static.neshan.org/sdk/openlayers/5.3.0/ol.js"></script>
<script>
const KEY='__NESHAN_KEY__';
const map=new ol.Map({target:'map',maptype:'dreamy',key:KEY,
  view:new ol.View({center:ol.proj.fromLonLat([${midLon}, ${midLat}]),zoom:15,maxZoom:19})});

const MINE='__mine';
function xyz(url,maxZoom,attr){
  const l=new ol.layer.Tile({visible:false,source:new ol.source.XYZ({url:url,attributions:attr||'',maxZoom:maxZoom||19})});
  l.set(MINE,true);
  return l;
}
function bingLayer(){
  const l=new ol.layer.Tile({visible:false,source:new ol.source.XYZ({
    maxZoom:19,
    tileUrlFunction:function(coord){
      const z=coord[0],x=coord[1],y=coord[2];
      let q='';
      for(let i=z;i>0;i--){const mask=1<<(i-1);let d=0;if((x&mask)!==0)d+=1;if((y&mask)!==0)d+=2;q+=d;}
      const s='abc'[(x+y)%3];
      return 'https://ecn.t'+s+'.tiles.virtualearth.net/tiles/a'+q+'.jpeg?g=1';
    }})});
  l.set(MINE,true);
  return l;
}
const gSat=xyz('https://mt{0-3}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',21,'© Google');
const gLbl=xyz('https://mt{0-3}.google.com/vt/lyrs=h&x={x}&y={y}&z={z}',21);
gSat.setVisible(true); gLbl.setVisible(true);
const gHyb=new ol.layer.Group({visible:false,layers:[gSat,gLbl]});
gHyb.set(MINE,true);
const extra={
  gsat:gSat,
  ghyb:gHyb,
  bing:bingLayer(),
  mapir:xyz('https://map.ir/shiveh/{z}/{x}/{y}.png',19,'© MapIr'),
  osm:xyz('https://tile.openstreetmap.org/{z}/{x}/{y}.png',19,'© OpenStreetMap')
};
Object.values(extra).forEach(l=>map.addLayer(l));

const styleFn=f=>{
  const k=f.get('k');
  if(k==='b')return new ol.style.Style({stroke:new ol.style.Stroke({color:'#ffb300',width:5})});
  if(k==='c')return new ol.style.Style({stroke:new ol.style.Stroke({color:'#ff2222',width:6})});
  if(k==='h')return new ol.style.Style({stroke:new ol.style.Stroke({color:'#00e5ff',width:2})});
  return new ol.style.Style({stroke:new ol.style.Stroke({color:'#eeeeee',width:2})});
};
const feats=new ol.format.GeoJSON().readFeatures(${JSON.stringify(gj)},{featureProjection:'EPSG:3857'});
map.addLayer(new ol.layer.Vector({source:new ol.source.Vector({features:feats}),style:styleFn,zIndex:50}));
const ptFeats=new ol.format.GeoJSON().readFeatures(${JSON.stringify({type:'FeatureCollection',features:vnodes.map(v=>({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[v[1],v[0]]}}))})},{featureProjection:'EPSG:3857'});
map.addLayer(new ol.layer.Vector({source:new ol.source.Vector({features:ptFeats}),
  style:new ol.style.Style({image:new ol.style.Circle({radius:2.5,fill:new ol.style.Fill({color:'#39ff88'})})}),zIndex:51}));

const neshanLayers=()=>map.getLayers().getArray().filter(l=>!l.get(MINE));
function setBase(name){
  neshanLayers().forEach(l=>l.setVisible(name==='neshan'));
  for (const k of Object.keys(extra)) extra[k].setVisible(k===name);
}
document.querySelectorAll('#bases input').forEach(inp=>inp.addEventListener('change',()=>setBase(inp.value)));
setBase('neshan');

map.on('singleclick',e=>{
  const f=map.forEachFeatureAtPixel(e.pixel,f2=>f2,{layerFilter:l=>l.getZIndex&&l.getZIndex()===50});
  document.querySelector('#bar b').textContent=f?f.get('n'):'پروژهٔ جدول‌گذاری نیاسری ماهدشت';
});
</script>
</body></html>`;
fs.writeFileSync('niasari-preview.html', html, 'utf8');
console.log('OL preview written:', Math.round(html.length/1024)+'KB');
