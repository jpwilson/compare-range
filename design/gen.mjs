// Generates the CompareRange design artboards (.dc.html) + canvas.json — "Neon orbit" direction.
// Run: node design/gen.mjs   (from the project root)
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));

// ---------- tokens (mirrors src/styles.css + src/data/categories.ts) ----------
const CAT = {
  ev:       { name: 'Electric cars',     short: 'EVs',         color: '#3ddc84' },
  car:      { name: 'Gas & hybrid cars', short: 'Cars',        color: '#ff6b6b' },
  moto:     { name: 'Motorcycles',       short: 'Motorcycles', color: '#ffb020' },
  heli:     { name: 'Helicopters',       short: 'Helicopters', color: '#e879f9' },
  plane:    { name: 'Planes',            short: 'Planes',      color: '#38bdf8' },
  jet:      { name: 'Business jets',     short: 'Jets',        color: '#a78bfa' },
  airliner: { name: 'Airliners',         short: 'Airliners',   color: '#22d3ee' },
};
const UI = {
  bg: '#07090f', glass: 'rgba(12, 15, 24, 0.82)', glassStrong: 'rgba(12, 15, 24, 0.94)', stroke: 'rgba(255, 255, 255, 0.08)', strokeStrong: 'rgba(255, 255, 255, 0.16)',
  text: '#f3f5f9', muted: '#8f97ab', dim: '#5f6678', chip: 'rgba(255, 255, 255, 0.06)', field: 'rgba(255, 255, 255, 0.05)', accent: '#22d3ee',
  grad: 'linear-gradient(120deg, #22d3ee 0%, #a78bfa 55%, #ff6b9d 100%)',
  land: '#10141f', ocean: '#0a0f1c', border: '#252c3d', road: '#1a2130', dot: '#7d8598', label: '#8f97ab',
};
const ICON = {
  car: '<path d="M3 13.5 5.2 8.6A2 2 0 0 1 7 7.4h10a2 2 0 0 1 1.8 1.2L21 13.5"></path><path d="M3 13.5h18v4.2a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1V17H6.6v.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path><circle cx="7" cy="15.2" r="0.9" fill="currentColor"></circle><circle cx="17" cy="15.2" r="0.9" fill="currentColor"></circle>',
  ev: '<path d="M3 13.5 5.2 8.6A2 2 0 0 1 7 7.4h10a2 2 0 0 1 1.8 1.2L21 13.5"></path><path d="M3 13.5h18v4.2a1 1 0 0 1-1 1h-1.6a1 1 0 0 1-1-1V17H6.6v.7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"></path><path d="m12.6 8.8-2 3h2.8l-2 3"></path>',
  moto: '<circle cx="5.5" cy="16" r="3"></circle><circle cx="18.5" cy="16" r="3"></circle><path d="M5.5 16 9 10h4l2.5 3.5H18M13 10l-1.5-3H9M9 10h4"></path>',
  heli: '<path d="M3 5h16M11 5v3"></path><path d="M6 12.5c0-2 1.6-3.5 4-3.5h3.5c2.4 0 4.5 1.6 4.5 3.7V14a2 2 0 0 1-2 2H9a3 3 0 0 1-3-3z"></path><path d="M8 16v2h8v-2M18 11h3"></path>',
  plane: '<path d="M12 3.5c.9 0 1.4 1 1.4 2.4V9l7.1 4.2v1.8L13.4 13v4l2.1 1.6v1.4L12 19l-3.5 1v-1.4L10.6 17v-4L3.5 15v-1.8L10.6 9V5.9c0-1.4.5-2.4 1.4-2.4z"></path>',
  jet: '<path d="M4 12.5 19 6.5c.9-.4 1.6.5 1.2 1.3L16 15l-3.5 1-2-2.5-3.5-.3z"></path><path d="M10.5 13.5 7 19l3-1.2 2.5-3.3M16 15l2.5 2"></path>',
  airliner: '<path d="M2.5 12.2 20 8.6c1 0 1.5.8 1.3 1.5L20.2 12 8.3 15.3l-3-1.2z"></path><path d="m8.3 15.3-.6 3.4 2.6-2.9M11.5 10.2 8 6h2.4l4.1 3.3"></path>',
};
const catIcon = (id, size = 18, color = 'currentColor') => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[id]}</svg>`;

// ---------- vehicles used in the mockup (figures match src/data/vehicles.ts) ----------
const V = [
  { id: 'goldwing', name: 'Honda Gold Wing', sub: '2024 · 5.5 gal', cat: 'moto', km: 370, on: true },
  { id: 'cyber', name: 'Tesla Cybertruck', sub: '2024 AWD · EPA', cat: 'ev', km: 525, on: true },
  { id: 'm3', name: 'Tesla Model 3 Long Range', sub: '2025 RWD · EPA', cat: 'ev', km: 585, on: false },
  { id: 'r44', name: 'Robinson R44', sub: 'Raven II', cat: 'heli', km: 650, on: true },
  { id: 'r1s', name: 'Rivian R1S', sub: 'Gen 2 Max pack · EPA', cat: 'ev', km: 660, on: true },
  { id: 'prius', name: 'Toyota Prius', sub: '2024 hybrid · tank × mpg', cat: 'car', km: 1035, on: true },
  { id: 'hx50', name: 'Hill HX50', sub: 'announced — manufacturer claim', cat: 'heli', km: 1295, on: true },
  { id: 'sr22', name: 'Cirrus SR22', sub: 'G7 · 55% power', cat: 'plane', km: 2165, on: true },
  { id: 'vision', name: 'Cirrus Vision Jet', sub: 'SF50 G2+', cat: 'jet', km: 2360, on: true },
  { id: 'pc12', name: 'Pilatus PC-12 NGX', sub: '4 pax · NBAA reserves', cat: 'plane', km: 3340, on: false },
  { id: 'g650', name: 'Gulfstream G650ER', sub: 'NBAA IFR · M0.85', cat: 'jet', km: 13890, on: true },
  { id: 'a380', name: 'Airbus A380', sub: 'typical multi-class', cat: 'airliner', km: 14815, on: true },
  { id: 'b777', name: 'Boeing 777-200LR', sub: 'typical two-class', cat: 'airliner', km: 15740, on: false },
];
const fmtKm = n => n.toLocaleString('en-US') + ' km';

// ---------- geography (rough sketch, lon/lat) ----------
const coastCAOR = [[-117.1,32.53],[-118.5,34.0],[-120.6,34.6],[-121.9,36.6],[-122.5,37.8],[-123.8,39.0],[-124.4,40.4],[-124.2,42],[-124.4,43.2],[-124.1,44.5],[-124.0,46.2]];
const bajaWest = [[-117.1,32.53],[-116.6,31.8],[-116.0,30.5],[-115.8,29.8],[-114.9,29.2],[-114.3,28.5],[-114.1,27.9],[-114.3,27.2],[-113.6,26.7],[-112.8,26.3],[-112.2,25.6],[-112.0,24.8],[-111.5,24.4],[-110.5,23.5],[-109.9,22.9]];
const bajaEast = [[-109.9,22.9],[-109.5,23.4],[-109.8,23.9],[-110.3,24.2],[-110.7,24.6],[-111.0,25.3],[-111.35,26.0],[-111.9,26.7],[-112.3,27.4],[-112.8,28.1],[-113.1,28.7],[-113.5,29.3],[-114.2,30.2],[-114.6,31.0],[-114.85,31.7]];
const sonora = [[-114.85,31.7],[-113.5,31.2],[-113.0,30.8],[-112.5,30.0],[-112.0,29.3],[-111.5,28.5],[-110.6,27.9],[-110.0,27.5],[-109.4,26.8],[-109.0,26.0],[-108.3,25.3],[-107.8,24.8],[-107.5,24.3],[-106.4,23.2],[-105.6,21.9]];
const pacific = [[-135,48], ...coastCAOR.slice().reverse(), ...bajaWest.slice(1), ...bajaEast.slice(1), ...sonora.slice(1), [-105,20],[-135,20]];
const gulfMx = [[-97.7,23.5],[-97.5,25.0],[-97.15,25.9],[-97.4,27.8],[-96.5,28.4],[-95.0,29.3],[-93.8,29.7],[-93.6,30.0],[-90,30.2],[-90,20],[-97.7,20]];
const usmx = [[-117.1,32.53],[-114.72,32.72],[-114.81,32.49],[-111.07,31.33],[-108.2,31.33],[-108.2,31.78],[-106.6,31.78],[-106.5,31.75],[-104.5,29.6],[-103.0,29.0],[-102.5,29.8],[-101.5,29.8],[-100.5,28.7],[-99.5,27.5],[-99.0,26.4],[-97.5,25.9]];
const states = {
  AZ: [[-114.05,37],[-109.05,37],[-109.05,31.33],[-111.07,31.33],[-114.81,32.49],[-114.72,32.72],[-114.5,33.0],[-114.65,33.4],[-114.5,34.1],[-114.63,34.87],[-114.05,36.0]],
  NM: [[-109.05,37],[-103.0,37],[-103.0,32.0],[-106.6,32.0],[-106.6,31.78],[-108.2,31.78],[-108.2,31.33],[-109.05,31.33]],
  UT: [[-114.05,42],[-111.05,42],[-111.05,41],[-109.05,41],[-109.05,37],[-114.05,37]],
  CO: [[-109.05,41],[-102.05,41],[-102.05,37],[-109.05,37]],
  NV: [[-120,42],[-114.05,42],[-114.05,36.0],[-114.63,35.0],[-120,39]],
  CA: [...coastCAOR.slice(0,8),[-120,42],[-120,39],[-114.63,35.0],[-114.63,34.87],[-114.5,34.1],[-114.65,33.4],[-114.5,33.0],[-114.72,32.72]],
  OR: [[-124.2,42],[-116.9,42],[-116.9,46],[-124.0,46.2]],
  ID: [[-116.9,42],[-111.05,42],[-111.05,45],[-117,45]],
  WY: [[-111.05,41],[-104.05,41],[-104.05,45],[-111.05,45]],
  NE: [[-104.05,43],[-98,43],[-95.3,40],[-102.05,40],[-102.05,41],[-104.05,41]],
  KS: [[-102.05,40],[-94.6,40],[-94.6,37],[-102.05,37]],
  OK: [[-103,37],[-94.6,37],[-94.6,33.7],[-95.5,33.9],[-96.5,33.8],[-97.5,33.9],[-100,34.5],[-100,36.5],[-103,36.5]],
  TX: [[-103.06,36.5],[-100,36.5],[-100,34.5],[-97.5,33.9],[-96.5,33.8],[-95.5,33.9],[-94.6,33.7],[-94.0,33.5],[-94.0,31.0],[-93.6,30.0],[-93.8,29.7],[-95.0,29.3],[-96.5,28.4],[-97.4,27.8],[-97.15,25.9],[-99.0,26.4],[-99.5,27.5],[-100.5,28.7],[-101.5,29.8],[-102.5,29.8],[-103.0,29.0],[-104.5,29.6],[-106.5,31.75],[-106.6,32.0],[-103.06,32.0]],
};
const cities = [
  ['Phoenix',-112.07,33.45,1],['Tucson',-110.97,32.22],['Flagstaff',-111.65,35.2],['Las Vegas',-115.14,36.17,1],['Los Angeles',-118.24,34.05,1],
  ['San Diego',-117.16,32.72],['Albuquerque',-106.65,35.08,1],['El Paso',-106.49,31.76],['Salt Lake City',-111.89,40.76,1],['Denver',-104.99,39.74,1],
  ['Santa Fe',-105.94,35.69],['Hermosillo',-110.96,29.07],['San Francisco',-122.42,37.77,1],['Fresno',-119.79,36.74],['Reno',-119.81,39.53],
  ['Amarillo',-101.83,35.22],['Lubbock',-101.86,33.58],['Chihuahua',-106.09,28.63],['Yuma',-114.63,32.69],['Grand Junction',-108.55,39.06],
  ['Oklahoma City',-97.52,35.47],['Dallas',-96.8,32.78,1],['Houston',-95.37,29.76,1],['San Antonio',-98.49,29.42],['Monterrey',-100.32,25.67],
  ['La Paz',-110.31,24.14],['Culiacán',-107.39,24.8],['Sacramento',-121.49,38.58],['Kansas City',-94.58,39.1],
];
const roads = [
  [['Los Angeles'],['Phoenix'],['Tucson'],['El Paso'],['San Antonio'],['Houston']],
  [['Phoenix'],['Flagstaff']],
  [[-117.0,34.9],['Flagstaff'],['Albuquerque'],['Amarillo'],['Oklahoma City']],
  [['San Diego'],['Los Angeles'],[-117.0,34.9],['Las Vegas'],[-113.58,37.1],['Salt Lake City']],
  [['El Paso'],['Albuquerque'],['Santa Fe'],['Denver']],
  [['San Diego'],['Yuma'],[-111.75,32.88]],
  [['Los Angeles'],[-119.0,35.4],['Fresno'],['Sacramento']],
  [['Dallas'],['Houston']],[['Dallas'],['Oklahoma City']],[['Denver'],['Kansas City']],
];
const cityXY = Object.fromEntries(cities.map(c => [c[0], [c[1], c[2]]]));

// ---------- projection ----------
function makeProj({ W, H, lon0, lat0, pxPerDeg, dy = 0 }) {
  const D = Math.PI / 180;
  const merc = lat => Math.log(Math.tan(Math.PI / 4 + (lat * D) / 2)) / D;
  const p = (lon, lat) => [W / 2 + (lon - lon0) * pxPerDeg, H / 2 + dy - (merc(lat) - merc(lat0)) * pxPerDeg];
  const pxPerKm = lat => pxPerDeg / (111.32 * Math.cos(lat * D));
  return { p, pxPerKm, W, H };
}
const R = 6371;
function haversine(a, b) {
  const D = Math.PI / 180, dφ = (b[1] - a[1]) * D, dλ = (b[0] - a[0]) * D;
  const h = Math.sin(dφ / 2) ** 2 + Math.cos(a[1] * D) * Math.cos(b[1] * D) * Math.sin(dλ / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function greatCircle(a, b, n = 24) {
  const D = Math.PI / 180, φ1 = a[1] * D, λ1 = a[0] * D, φ2 = b[1] * D, λ2 = b[0] * D;
  const d = haversine(a, b) / R, pts = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([Math.atan2(y, x) / D, Math.atan2(z, Math.sqrt(x * x + y * y)) / D]);
  }
  return pts;
}

// ---------- svg helpers ----------
const f1 = n => Math.round(n * 10) / 10;
const path = (pr, pts, close) => pts.map(([lon, lat], i) => (i ? 'L' : 'M') + pr.p(lon, lat).map(f1).join(' ')).join(' ') + (close ? ' Z' : '');
const resolve = pt => (typeof pt[0] === 'string' ? cityXY[pt[0]] : pt);

function basemap(pr, { labels = true, labelFilter = () => true } = {}) {
  const { W, H } = pr;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; inset: 0;">`;
  s += `<rect width="${W}" height="${H}" fill="${UI.land}"></rect>`;
  s += `<path d="${path(pr, pacific, true)}" fill="${UI.ocean}"></path>`;
  s += `<path d="${path(pr, gulfMx, true)}" fill="${UI.ocean}"></path>`;
  for (const st of Object.values(states)) s += `<path d="${path(pr, st, true)}" fill="none" stroke="${UI.border}" stroke-width="1"></path>`;
  s += `<path d="${path(pr, usmx, false)}" fill="none" stroke="#3a4358" stroke-width="1.6" stroke-dasharray="6 3"></path>`;
  for (const rd of roads) s += `<path d="${path(pr, rd.map(resolve), false)}" fill="none" stroke="${UI.road}" stroke-width="1.6"></path>`;
  s += `</svg>`;
  let l = '';
  if (labels) for (const [name, lon, lat, big] of cities) {
    if (!labelFilter(name)) continue;
    const [x, y] = pr.p(lon, lat);
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    l += `<div style="position: absolute; left: ${f1(x)}px; top: ${f1(y)}px; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 5px; pointer-events: none;">` +
      `<span style="display: block; width: ${big ? 6 : 4}px; height: ${big ? 6 : 4}px; border-radius: 50%; background: ${UI.dot};"></span>` +
      `<span style="font-size: ${big ? 12 : 11}px; font-weight: ${big ? 700 : 500}; color: ${UI.label}; letter-spacing: 0.02em; text-shadow: 0 0 4px ${UI.land}, 0 0 4px ${UI.land};">${name}</span></div>`;
  }
  return s + l;
}

function rings(pr, origin, list, { strokeW = 2, alpha = '29', glow = true } = {}) {
  const [cx, cy] = pr.p(...origin), k = pr.pxPerKm(origin[1]);
  const asc = list.slice().sort((a, b) => a.km - b.km);
  let s = `<svg width="${pr.W}" height="${pr.H}" viewBox="0 0 ${pr.W} ${pr.H}" style="position: absolute; inset: 0;"><defs><filter id="glow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"></feGaussianBlur></filter></defs>`;
  asc.forEach((v, i) => {
    const c = CAT[v.cat].color, ro = v.km * k, ri = i ? asc[i - 1].km * k : 0;
    const ring = r => `M${f1(cx + r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx - r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx + r)} ${f1(cy)}Z`;
    s += `<path d="${ring(ro)}${ri ? ring(ri) : ''}" fill="${c}${alpha}" fill-rule="evenodd"></path>`;
  });
  for (const v of asc) {
    const c = CAT[v.cat].color, r = f1(v.km * k);
    if (glow) s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="none" stroke="${c}" stroke-width="10" stroke-opacity="0.4" filter="url(#glow)"></circle>`;
    s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${r}" fill="none" stroke="${c}" stroke-width="${strokeW}"></circle>`;
  }
  return s + `</svg>`;
}
function sweep(pr, origin) {
  const [x, y] = pr.p(...origin);
  return `<div style="position: absolute; left: ${f1(x - 110)}px; top: ${f1(y - 110)}px; width: 220px; height: 220px; border-radius: 50%; background: conic-gradient(from 20deg, rgba(34, 211, 238, 0.45) 0deg, rgba(34, 211, 238, 0.08) 40deg, transparent 70deg); -webkit-mask: radial-gradient(circle, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 72%); mask: radial-gradient(circle, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.6) 50%, transparent 72%); animation: sweep 3.2s linear infinite; pointer-events: none;"></div>`;
}
function pin(pr, lonlat, color = UI.text, label) {
  const [x, y] = pr.p(...lonlat);
  return `<div style="position: absolute; left: ${f1(x)}px; top: ${f1(y)}px; transform: translate(-50%, -100%); display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0 6px 12px rgba(0, 0, 0, 0.6));">` +
    `<svg width="28" height="36" viewBox="0 0 28 36"><path d="M14 35 C14 35 3 21 3 13 A11 11 0 0 1 25 13 C25 21 14 35 14 35 Z" fill="${color}" stroke="${UI.bg}" stroke-width="2"></path><circle cx="14" cy="13" r="4.5" fill="${UI.bg}"></circle></svg></div>` +
    (label ? `<div style="position: absolute; left: ${f1(x)}px; top: ${f1(y) + 6}px; transform: translateX(-50%); background: ${UI.text}; color: ${UI.bg}; font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 999px; white-space: nowrap;">${label}</div>` : '');
}
function ringLabel(pr, origin, v, angle, opts = {}) {
  const [cx, cy] = pr.p(...origin), k = pr.pxPerKm(origin[1]), r = v.km * k, a = (angle * Math.PI) / 180;
  const x = cx + r * Math.cos(a), y = cy + r * Math.sin(a), c = CAT[v.cat].color;
  const tx = opts.anchor === 'right' ? 'translate(-100%, -50%)' : 'translate(0, -50%)';
  return `<div style="position: absolute; left: ${f1(x)}px; top: ${f1(y)}px; transform: ${tx}; display: flex; align-items: center; gap: 7px; background: ${UI.glassStrong}; border: 1px solid ${c}; border-radius: 999px; padding: 4px 10px 4px 8px; box-shadow: 0 0 18px ${c}55, 0 6px 16px rgba(0, 0, 0, 0.5); white-space: nowrap;">` +
    `<span style="display: block; width: 8px; height: 8px; border-radius: 50%; background: ${c}; box-shadow: 0 0 10px ${c};"></span>` +
    `<span style="font-size: 12px; font-weight: 700; color: ${c};">${v.name}</span>` +
    `<span style="font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; font-size: 11.5px; color: ${UI.muted};">${fmtKm(v.km)}</span></div>`;
}

// ---------- icons (stroke, 20px grid) ----------
const ic = (d, size = 18, color = 'currentColor') => `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none" stroke="${color}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const I = {
  search: ic('<circle cx="9" cy="9" r="5.5"></circle><path d="M13.2 13.2 17 17"></path>'),
  pin: ic('<path d="M10 18s-6-6.3-6-10a6 6 0 0 1 12 0c0 3.7-6 10-6 10Z"></path><circle cx="10" cy="8" r="2"></circle>', 18, UI.accent),
  plus: ic('<path d="M10 4v12M4 10h12"></path>'),
  minus: ic('<path d="M4 10h12"></path>'),
  globe: ic('<circle cx="10" cy="10" r="7.5"></circle><path d="M2.5 10h15M10 2.5c2.5 2.6 2.5 12.4 0 15M10 2.5c-2.5 2.6-2.5 12.4 0 15"></path>'),
  fit: ic('<path d="M3 7V3h4M13 3h4v4M17 13v4h-4M7 17H3v-4"></path><circle cx="10" cy="10" r="3"></circle>'),
  layers: ic('<path d="m10 3 7.5 4L10 11 2.5 7z"></path><path d="m2.5 10.5 7.5 4 7.5-4M2.5 14l7.5 4 7.5-4"></path>'),
  logo: `<svg width="26" height="26" viewBox="0 0 30 30" fill="none"><circle cx="15" cy="15" r="13" stroke="#22d3ee" stroke-width="2"></circle><circle cx="15" cy="15" r="8.5" stroke="#a78bfa" stroke-width="2"></circle><circle cx="15" cy="15" r="4" fill="#3ddc84"></circle></svg>`,
  arrow: ic('<path d="M4 10h12M11 5l5 5-5 5"></path>', 16),
  chev: ic('<path d="M7 4l6 6-6 6"></path>', 14),
  x: ic('<path d="M5 5l10 10M15 5 5 15"></path>', 14),
  swap: ic('<path d="M4 7h11l-3-3M16 13H5l3 3"></path>', 16),
  share: ic('<path d="M10 12V3M6.5 6.5 10 3l3.5 3.5"></path><path d="M4 11v5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-5"></path>', 16),
};

// ---------- shared UI fragments ----------
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";
const DISPLAY = "'Unbounded', 'Avenir Next', 'Segoe UI', system-ui, sans-serif";
const helmet = `<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&amp;family=Manrope:wght@400;500;600;700;800&amp;family=JetBrains+Mono:wght@500;600&amp;display=swap">
  <style>
    body { margin: 0; font-family: 'Manrope', system-ui, -apple-system, sans-serif; color: ${UI.text}; -webkit-font-smoothing: antialiased; }
    a { color: ${UI.accent}; } a:hover { color: ${UI.text}; }
    @keyframes pulse { 0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0.7; } 100% { transform: translate(-50%, -50%) scale(3); opacity: 0; } }
    @keyframes sweep { to { transform: rotate(360deg); } }
  </style>
</helmet>`;
const wordmark = (size = 21) => `<div style="display: flex; align-items: center; gap: 10px;">${I.logo}<div style="font-family: ${DISPLAY}; font-weight: 800; font-size: ${size}px; letter-spacing: -0.03em; line-height: 1; background: ${UI.grad}; -webkit-background-clip: text; background-clip: text; color: transparent;">CompareRange</div></div>`;
const badge = txt => `<span style="font-family: ${MONO}; font-size: 10.5px; letter-spacing: 0.06em; text-transform: uppercase; color: ${UI.muted}; border: 1px solid ${UI.stroke}; border-radius: 999px; padding: 4px 8px; display: inline-flex; align-items: center; gap: 6px;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #3ddc84; box-shadow: 0 0 10px #3ddc84;"></span>${txt}</span>`;
const seg = (items, active, { small = false } = {}) => `<div style="display: flex; gap: 2px; background: ${UI.chip}; border: 1px solid ${UI.stroke}; border-radius: 14px; padding: 4px;">` +
  items.map(t => `<div style="flex: 1; text-align: center; padding: ${small ? '7px 10px' : '9px 12px'}; border-radius: 10px; font-size: ${small ? 12 : 13}px; font-weight: 700; ${t === active ? `background: ${UI.text}; color: ${UI.bg}; box-shadow: 0 6px 18px rgba(255, 255, 255, 0.12);` : `color: ${UI.muted};`}">${t}</div>`).join('') + `</div>`;
const rbtn = (icon, active) => `<div style="width: 38px; height: 38px; border-radius: 999px; display: flex; align-items: center; justify-content: center; ${active ? `background: ${UI.text}; color: ${UI.bg};` : `color: ${UI.muted};`}">${icon}</div>`;
const unitBtn = (t, active) => `<div style="padding: 8px 12px; border-radius: 999px; font-family: ${MONO}; font-size: 12px; font-weight: 600; ${active ? `background: ${UI.text}; color: ${UI.bg};` : `color: ${UI.muted};`}">${t}</div>`;
const toolbar = ({ globe = true } = {}) => `<div style="position: absolute; top: 20px; right: 20px; display: flex; align-items: center; gap: 6px; padding: 6px; background: ${UI.glass}; backdrop-filter: blur(20px); border: 1px solid ${UI.stroke}; border-radius: 999px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);">` +
  `<div style="display: flex; gap: 2px;">${unitBtn('km', true)}${unitBtn('mi')}${unitBtn('nm')}</div><span style="width: 1px; height: 22px; background: ${UI.strokeStrong}; margin: 0 4px;"></span>${rbtn(I.globe, globe)}${rbtn(I.fit)}${rbtn(I.layers)}</div>` +
  `<div style="position: absolute; right: 20px; top: 84px; display: flex; flex-direction: column; gap: 4px; padding: 4px; background: ${UI.glass}; border: 1px solid ${UI.stroke}; border-radius: 999px;">${rbtn(I.plus)}${rbtn(I.minus)}</div>`;
const attribution = `<div style="position: absolute; right: 0; bottom: 0; font-size: 10.5px; color: ${UI.dim}; background: rgba(7, 9, 15, 0.7); padding: 3px 8px; border-radius: 8px 0 0 0;">OpenFreeMap © OpenMapTiles · Data from OpenStreetMap</div>`;
const glassPanel = (inner, { x = 20, y = 20, w = 400, h = 860 } = {}) => `<div style="position: absolute; left: ${x}px; top: ${y}px; width: ${w}px; height: ${h}px; background: ${UI.glass}; backdrop-filter: blur(24px) saturate(140%); border: 1px solid ${UI.stroke}; border-radius: 24px; box-shadow: 0 30px 80px rgba(0, 0, 0, 0.55); display: flex; flex-direction: column; overflow: hidden;">${inner}</div>`;
const fade = (h = 60) => `<div style="position: absolute; left: 0; right: 0; bottom: 0; height: ${h}px; background: linear-gradient(rgba(12, 15, 24, 0), rgba(12, 15, 24, 0.95)); pointer-events: none;"></div>`;
const catHeader = (cat, right = 'All') => `<div style="display: flex; align-items: center; gap: 8px; padding: 16px 6px 8px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${cat.color}; box-shadow: 0 0 12px ${cat.color};"></span><span style="flex: 1; font-family: ${MONO}; font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${UI.muted};">${cat.name}</span><span style="font-size: 11.5px; font-weight: 700; color: ${UI.muted};">${right}</span></div>`;

function vehicleCards(list) {
  const groups = {};
  for (const v of list) (groups[v.cat] ??= []).push(v);
  let s = '';
  for (const [cat, vs] of Object.entries(groups)) {
    const c = CAT[cat];
    s += catHeader(c, vs.every(v => v.on) ? 'Clear' : 'All');
    for (const v of vs) {
      const col = c.color;
      s += `<div style="display: flex; align-items: center; gap: 12px; padding: 9px 10px; min-height: 52px; border-radius: 16px; margin-bottom: 4px; ${v.on ? `background: ${UI.chip}; border: 1px solid ${col}88; box-shadow: 0 0 0 1px ${col}40 inset, 0 8px 28px ${col}2e;` : `border: 1px solid transparent;`}">` +
        `<div style="width: 34px; height: 34px; border-radius: 11px; display: flex; align-items: center; justify-content: center; ${v.on ? `background: ${col}; color: ${UI.bg}; box-shadow: 0 0 18px ${col}99;` : `background: rgba(255, 255, 255, 0.05); border: 1px solid ${UI.stroke}; color: ${UI.muted};`}">${catIcon(cat)}</div>` +
        `<div style="flex: 1; min-width: 0;"><div style="font-size: 14px; font-weight: 700; color: ${v.on ? UI.text : UI.muted}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${v.name}</div><div style="font-size: 11.5px; color: ${UI.dim}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 1px;">${v.sub}</div></div>` +
        `<div style="font-family: ${MONO}; font-size: 12.5px; font-weight: 600; padding: 5px 9px; border-radius: 999px; background: rgba(255, 255, 255, 0.04); border: 1px solid ${v.on ? col + '66' : UI.stroke}; color: ${v.on ? col : UI.muted}; white-space: nowrap;">${fmtKm(v.km)}</div></div>`;
    }
  }
  return s;
}
const chip = (t, active, icon) => `<div style="display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; font-size: 12.5px; font-weight: 700; white-space: nowrap; flex: none; ${active ? `background: ${UI.text}; color: ${UI.bg};` : `background: ${UI.chip}; border: 1px solid ${UI.stroke}; color: ${UI.muted};`}">${icon || ''}${t}</div>`;
const chips = () => `<div style="display: flex; gap: 6px; overflow: hidden; padding: 2px 6px 8px;">${chip('All', true)}${chip('Selected · 10')}${chip('EVs', false, catIcon('ev', 15))}${chip('Cars', false, catIcon('car', 15))}${chip('Motorcycles', false, catIcon('moto', 15))}${chip('Helicopters', false, catIcon('heli', 15))}</div>`;
const shareBtn = `<div style="display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; border-radius: 999px; padding: 11px 16px; background: ${UI.grad}; color: ${UI.bg}; box-shadow: 0 8px 28px rgba(167, 139, 250, 0.35);">${I.share} Share</div>`;
const field = (label, value, { icon, trailing = '' } = {}) => `<div style="display: flex; align-items: center; gap: 10px; background: ${UI.field}; border: 1px solid ${UI.strokeStrong}; border-radius: 14px; padding: 0 12px; height: 48px;">${label ? `<span style="font-family: ${MONO}; font-size: 10.5px; font-weight: 600; color: ${UI.muted}; width: 38px; letter-spacing: 0.08em;">${label}</span>` : ''}${icon ? `<span style="display: flex;">${icon}</span>` : ''}<div style="flex: 1; font-size: 14.5px; font-weight: 700;">${value}</div>${trailing}</div>`;

// ---------- Main: desktop, range rings ----------
const PHX = [-112.07, 33.45];
function mainArtboard() {
  const pr = makeProj({ W: 1440, H: 900, lon0: -112.0, lat0: 33.9, pxPerDeg: 41.1 });
  const on = V.filter(v => v.on);
  const visible = on.filter(v => v.km < 2000);
  const beyond = on.filter(v => v.km >= 2000);
  const [px, py] = pr.p(...PHX);
  const labels = [
    ringLabel(pr, PHX, V.find(v => v.id === 'goldwing'), -62),
    ringLabel(pr, PHX, V.find(v => v.id === 'cyber'), -28),
    ringLabel(pr, PHX, V.find(v => v.id === 'r44'), 22),
    ringLabel(pr, PHX, V.find(v => v.id === 'r1s'), -8),
    ringLabel(pr, PHX, V.find(v => v.id === 'prius'), -36),
    ringLabel(pr, PHX, V.find(v => v.id === 'hx50'), -20),
  ].join('');
  const longest = on.slice().sort((a, b) => b.km - a.km)[0];
  const panel = `
    <div style="padding: 22px 22px 14px; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">${wordmark(21)}${badge('75 vehicles')}</div>
      <div style="font-family: ${DISPLAY}; font-weight: 700; font-size: 24px; letter-spacing: -0.02em; line-height: 1.12;">How far can it go <span style="color: ${UI.muted}; font-weight: 500;">from here?</span></div>
      ${field('', 'Phoenix, Arizona', { icon: I.pin })}
      <div style="font-size: 12.5px; color: ${UI.muted}; margin-top: -6px;">Or click anywhere on the map to move the pin.</div>
      ${seg(['Range rings', 'Can it get there?'], 'Range rings')}
    </div>
    <div style="display: flex; align-items: center; justify-content: space-between; margin: 0 22px 6px;">
      <div style="font-family: ${DISPLAY}; font-weight: 700; font-size: 14px;">Vehicles <span style="color: ${UI.muted}; font-weight: 500; font-family: ${MONO}; font-size: 12px; margin-left: 6px;">· 10 of 75</span></div>
      <div style="display: flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 700; color: ${UI.accent};">Rank ${I.chev}</div>
    </div>
    <div style="flex: 1; overflow: hidden; padding: 0 16px; position: relative;">
      ${chips()}
      ${vehicleCards(V.filter(v => ['goldwing', 'cyber', 'm3', 'r1s', 'r44', 'hx50', 'prius'].includes(v.id)))}
      ${fade()}
    </div>
    <div style="padding: 14px 22px 18px; border-top: 1px solid ${UI.stroke}; display: flex; align-items: center; gap: 12px; background: rgba(255, 255, 255, 0.02);">
      <div style="flex: 1;">
        <div style="font-family: ${MONO}; font-size: 10.5px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${UI.muted};">Longest range selected</div>
        <div style="display: flex; align-items: baseline; gap: 8px; margin-top: 4px;"><span style="font-family: ${DISPLAY}; font-size: 14px; font-weight: 700;">${longest.name}</span><span style="font-family: ${MONO}; font-size: 13px; color: ${CAT[longest.cat].color};">${fmtKm(longest.km)}</span></div>
      </div>
      ${shareBtn}
    </div>`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${helmet}
<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; background: ${UI.bg};">
  ${basemap(pr)}
  ${rings(pr, PHX, visible)}
  <div style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(3, 4, 8, 0.55) 100%);"></div>
  ${sweep(pr, PHX)}
  <div style="position: absolute; left: ${f1(px)}px; top: ${f1(py)}px; width: 26px; height: 26px; border-radius: 50%; background: ${UI.text}; animation: pulse 2.2s ease-out infinite;"></div>
  ${pin(pr, PHX)}
  ${labels}
  ${toolbar({ globe: false })}
  <div style="position: absolute; right: 20px; bottom: 40px; background: ${UI.glass}; backdrop-filter: blur(20px); border: 1px solid ${UI.stroke}; border-radius: 18px; padding: 14px 16px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45); max-width: 300px;">
    <div style="font-family: ${MONO}; font-size: 10.5px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: ${UI.muted}; margin-bottom: 10px;">Beyond this view</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${beyond.map(v => `<div style="display: flex; align-items: center; gap: 8px;"><span style="width: 8px; height: 8px; border-radius: 50%; background: ${CAT[v.cat].color}; box-shadow: 0 0 10px ${CAT[v.cat].color};"></span><span style="flex: 1; font-size: 13px; font-weight: 700;">${v.name}</span><span style="font-family: ${MONO}; font-size: 12px; color: ${UI.muted};">${fmtKm(v.km)}</span></div>`).join('')}
    </div>
    <div style="display: flex; align-items: center; gap: 6px; margin-top: 12px; font-size: 12.5px; font-weight: 700; color: ${UI.accent};">Zoom out to the globe ${I.arrow}</div>
  </div>
  ${attribution}
  ${glassPanel(panel)}
</div>
</x-dc>
</body>
</html>
`;
}

// ---------- Destination: desktop, "can it get there?" ----------
const DEN = [-104.99, 39.74];
function destinationArtboard() {
  const pr = makeProj({ W: 1440, H: 900, lon0: -112.0, lat0: 35.3, pxPerDeg: 41.1 });
  const dist = Math.round(haversine(PHX, DEN));
  const on = V.filter(v => v.on);
  const can = on.filter(v => v.km >= dist).sort((a, b) => a.km - b.km);
  const cant = on.filter(v => v.km < dist).sort((a, b) => b.km - a.km);
  const gc = greatCircle(PHX, DEN);
  const d = gc.map(([lon, lat], i) => (i ? 'L' : 'M') + pr.p(lon, lat).map(f1).join(' ')).join(' ');
  const mid = pr.p(...gc[12]);
  const card = (v, right, sub, bar) => `<div style="display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 16px; border: 1px solid ${UI.stroke}; background: ${UI.chip}; margin-bottom: 6px;">` +
    `<span style="width: 10px; height: 10px; border-radius: 50%; background: ${CAT[v.cat].color}; box-shadow: 0 0 12px ${CAT[v.cat].color}; flex: none;"></span>` +
    `<div style="flex: 1; min-width: 0;"><div style="font-size: 14px; font-weight: 700;">${v.name}</div><div style="font-size: 11.5px; color: ${UI.muted}; margin-top: 1px;">${sub}</div>${bar !== undefined ? `<div style="height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.08); margin-top: 7px; overflow: hidden;"><div style="width: ${bar}%; height: 100%; border-radius: 3px; background: ${CAT[v.cat].color}; box-shadow: 0 0 12px ${CAT[v.cat].color};"></div></div>` : ''}</div>` +
    `<div style="font-family: ${MONO}; font-size: 12.5px; font-weight: 600; text-align: right; white-space: nowrap;">${right}</div></div>`;
  const panel = `
    <div style="padding: 22px 22px 14px; display: flex; flex-direction: column; gap: 14px;">
      <div style="display: flex; align-items: center; justify-content: space-between;">${wordmark(21)}${badge('75 vehicles')}</div>
      <div style="font-family: ${DISPLAY}; font-weight: 700; font-size: 24px; letter-spacing: -0.02em; line-height: 1.12;">Can it get <span style="color: ${UI.muted}; font-weight: 500;">there?</span></div>
      <div style="display: flex; flex-direction: column; border: 1px solid ${UI.strokeStrong}; border-radius: 14px; background: ${UI.field};">
        <div style="display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 46px; border-bottom: 1px solid ${UI.stroke};"><span style="font-family: ${MONO}; font-size: 10.5px; font-weight: 600; color: ${UI.muted}; width: 38px; letter-spacing: 0.08em;">FROM</span><div style="flex: 1; font-size: 14.5px; font-weight: 700;">Phoenix, Arizona</div></div>
        <div style="display: flex; align-items: center; gap: 10px; padding: 0 12px; height: 46px;"><span style="font-family: ${MONO}; font-size: 10.5px; font-weight: 600; color: ${UI.muted}; width: 38px; letter-spacing: 0.08em;">TO</span><div style="flex: 1; font-size: 14.5px; font-weight: 700;">Denver, Colorado</div><span style="color: ${UI.muted}; display: flex;">${I.x}</span><span style="color: ${UI.muted}; display: flex;">${I.swap}</span></div>
      </div>
      ${seg(['Range rings', 'Can it get there?'], 'Can it get there?')}
    </div>
    <div style="flex: 1; overflow: hidden; padding: 0 16px; position: relative;">
      <div style="display: flex; flex-direction: column; gap: 4px; margin: 6px 6px 12px;"><span style="font-family: ${DISPLAY}; font-weight: 800; font-size: 40px; letter-spacing: -0.03em; line-height: 1; background: ${UI.grad}; -webkit-background-clip: text; background-clip: text; color: transparent;">${dist.toLocaleString('en-US')} km</span><span style="font-family: ${MONO}; font-size: 12px; color: ${UI.muted};">${Math.round(dist / 1.609344).toLocaleString('en-US')} mi · ${Math.round(dist / 1.852).toLocaleString('en-US')} nm · great-circle</span></div>
      ${catHeader({ name: `Makes it non-stop · ${can.length}`, color: CAT.ev.color }, '')}
      ${can.map(v => card(v, `${Math.round((dist / v.km) * 100)}% used`, `${fmtKm(v.km)} range · ${fmtKm(v.km - dist)} to spare`, Math.round((dist / v.km) * 100))).join('')}
      ${catHeader({ name: `Needs a stop · ${cant.length}`, color: CAT.car.color }, '')}
      ${cant.map(v => { const stops = Math.ceil(dist / v.km) - 1; return card(v, `${stops} stop${stops > 1 ? 's' : ''}`, `${fmtKm(v.km)} range · ${Math.round((v.km / dist) * 100)}% of the way`); }).join('')}
      ${fade(50)}
    </div>
    <div style="padding: 14px 22px 18px; border-top: 1px solid ${UI.stroke}; font-size: 12px; color: ${UI.dim}; line-height: 1.5;">Straight-line distance. Roads add ~15–25%; aircraft ranges assume typical payload and reserves.</div>`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${helmet}
<div style="position: relative; width: 1440px; height: 900px; overflow: hidden; background: ${UI.bg};">
  ${basemap(pr)}
  ${rings(pr, PHX, on.filter(v => v.km < 2000), { strokeW: 1.2, alpha: '14', glow: false })}
  <div style="position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(3, 4, 8, 0.55) 100%);"></div>
  <svg width="1440" height="900" viewBox="0 0 1440 900" style="position: absolute; inset: 0;"><defs><filter id="lglow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"></feGaussianBlur></filter></defs><path d="${d}" fill="none" stroke="${UI.text}" stroke-width="10" stroke-opacity="0.35" stroke-linecap="round" filter="url(#lglow)"></path><path d="${d}" fill="none" stroke="${UI.text}" stroke-width="2.5" stroke-dasharray="8 6" stroke-linecap="round"></path></svg>
  <div style="position: absolute; left: ${f1(mid[0])}px; top: ${f1(mid[1])}px; transform: translate(-50%, -50%); background: ${UI.text}; color: ${UI.bg}; border-radius: 999px; padding: 6px 12px; display: flex; align-items: baseline; gap: 6px; box-shadow: 0 0 24px rgba(255, 255, 255, 0.25);"><span style="font-family: ${MONO}; font-size: 14px; font-weight: 600;">${dist.toLocaleString('en-US')} km</span><span style="font-size: 11px; opacity: 0.7;">great-circle</span></div>
  ${pin(pr, PHX, UI.text, 'From')}
  ${pin(pr, DEN, '#ff6b9d', 'To')}
  ${toolbar({ globe: false })}
  ${attribution}
  ${glassPanel(panel)}
</div>
</x-dc>
</body>
</html>
`;
}

// ---------- Mobile ----------
function mobileArtboard() {
  const pr = makeProj({ W: 390, H: 844, lon0: -112.07, lat0: 33.45, pxPerDeg: 23.5, dy: -150 });
  const on = V.filter(v => v.on && v.km < 2000);
  const longest = V.filter(v => v.on).sort((a, b) => b.km - a.km)[0];
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${helmet}
<div style="position: relative; width: 390px; height: 844px; overflow: hidden; background: ${UI.bg};">
  ${basemap(pr, { labelFilter: n => ['Phoenix', 'Tucson', 'Flagstaff', 'Las Vegas', 'Los Angeles', 'San Diego', 'Albuquerque', 'El Paso', 'Yuma', 'Hermosillo'].includes(n) })}
  ${rings(pr, PHX, on)}
  ${sweep(pr, PHX)}
  ${pin(pr, PHX)}
  ${ringLabel(pr, PHX, V.find(v => v.id === 'cyber'), 150)}
  ${ringLabel(pr, PHX, V.find(v => v.id === 'r1s'), -50, { anchor: 'right' })}
  <div style="position: absolute; left: 12px; right: 12px; top: 12px; display: flex; align-items: center; gap: 10px; background: ${UI.glass}; backdrop-filter: blur(20px); border: 1px solid ${UI.stroke}; border-radius: 16px; padding: 10px 14px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45);">
    ${wordmark(17)}<span style="flex: 1;"></span><span style="color: ${UI.accent}; display: flex;">${I.share}</span>
  </div>
  <div style="position: absolute; left: 12px; right: 12px; top: 70px; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px; background: ${UI.glass}; backdrop-filter: blur(20px); border: 1px solid ${UI.stroke}; border-radius: 999px;">
    <div style="display: flex; gap: 2px;">${unitBtn('km', true)}${unitBtn('mi')}${unitBtn('nm')}</div><span style="width: 1px; height: 22px; background: ${UI.strokeStrong}; margin: 0 4px;"></span>${rbtn(I.globe, true)}${rbtn(I.fit)}${rbtn(I.layers)}
  </div>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; height: 400px; background: ${UI.glassStrong}; border: 1px solid ${UI.stroke}; border-bottom: 0; border-radius: 26px 26px 0 0; box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5); display: flex; flex-direction: column; overflow: hidden;">
    <div style="display: flex; justify-content: center; padding: 10px 0 2px;"><div style="width: 42px; height: 5px; border-radius: 3px; background: rgba(255, 255, 255, 0.2);"></div></div>
    <div style="padding: 6px 16px 10px; display: flex; flex-direction: column; gap: 10px;">${field('', 'Phoenix, AZ', { icon: I.pin })}${seg(['Range rings', 'Can it get there?'], 'Range rings', { small: true })}</div>
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 22px 0;">
      <div style="font-family: ${DISPLAY}; font-weight: 700; font-size: 14px;">Vehicles <span style="color: ${UI.muted}; font-weight: 500; font-family: ${MONO}; font-size: 12px; margin-left: 6px;">· 10 of 75</span></div>
      <div style="font-size: 12px; color: ${UI.muted};">Longest: <span style="font-weight: 700; color: ${UI.text};">${longest.name}</span></div>
    </div>
    <div style="flex: 1; overflow: hidden; padding: 6px 10px 0; position: relative;">
      ${chips()}
      ${vehicleCards(V.filter(v => ['goldwing', 'cyber', 'r1s'].includes(v.id)))}
      ${fade(50)}
    </div>
  </div>
</div>
</x-dc>
</body>
</html>
`;
}

// ---------- Direction B: low-fi light "Holo" alternate ----------
function holoArtboard() {
  const W = 1100, H = 700;
  const pr = makeProj({ W, H, lon0: -110.3, lat0: 33.9, pxPerDeg: 31 });
  const [cx, cy] = pr.p(...PHX), k = pr.pxPerKm(PHX[1]);
  const on = V.filter(v => v.on && v.km < 2000).sort((a, b) => b.km - a.km);
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="position: absolute; inset: 0;">`;
  for (const st of Object.values(states)) svg += `<path d="${path(pr, st, true)}" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="1"></path>`;
  svg += `<path d="${path(pr, pacific, true)}" fill="rgba(255,255,255,0.35)"></path>`;
  for (const v of on) svg += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(v.km * k)}" fill="${CAT[v.cat].color}22" stroke="${CAT[v.cat].color}" stroke-width="2"></circle>`;
  svg += `</svg>`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
${helmet}
<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: radial-gradient(80% 60% at 10% 10%, #c7f9ff 0%, transparent 60%), radial-gradient(70% 60% at 90% 20%, #e9d5ff 0%, transparent 60%), radial-gradient(80% 70% at 60% 100%, #ffd6e7 0%, transparent 60%), #f4f6fb; color: #0f1222;">
  ${svg}
  <div style="position: absolute; left: 20px; top: 20px; width: 340px; bottom: 20px; background: rgba(255, 255, 255, 0.55); backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 30px 80px rgba(80, 60, 140, 0.18);">
    <div style="font-family: ${DISPLAY}; font-weight: 800; font-size: 20px; letter-spacing: -0.03em; background: linear-gradient(120deg, #0ea5e9, #8b5cf6 55%, #ec4899); -webkit-background-clip: text; background-clip: text; color: transparent;">CompareRange</div>
    <div style="font-family: ${DISPLAY}; font-weight: 700; font-size: 22px; line-height: 1.15;">How far can it go from here?</div>
    <div style="height: 44px; border-radius: 14px; background: rgba(255, 255, 255, 0.7); border: 1px solid rgba(15, 18, 34, 0.1); display: flex; align-items: center; padding: 0 12px; font-weight: 700;">Phoenix, Arizona</div>
    ${on.map(v => `<div style="display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; background: rgba(255, 255, 255, 0.6); border: 1px solid ${CAT[v.cat].color}66;"><span style="width: 10px; height: 10px; border-radius: 50%; background: ${CAT[v.cat].color};"></span><span style="flex: 1; font-weight: 700; font-size: 13px;">${v.name}</span><span style="font-family: ${MONO}; font-size: 12px;">${fmtKm(v.km)}</span></div>`).join('')}
  </div>
  <div style="position: absolute; left: 24px; bottom: 12px; font-family: ${MONO}; font-size: 11px; letter-spacing: 0.08em; color: #5b6078;">DIRECTION B · "HOLO" · LOW-FI ALTERNATE · LIGHT HOLOGRAPHIC GRADIENTS, SAME NEON RINGS</div>
</div>
</x-dc>
</body>
</html>
`;
}

writeFileSync(join(here, 'Main.dc.html'), mainArtboard());
writeFileSync(join(here, 'Destination.dc.html'), destinationArtboard());
writeFileSync(join(here, 'Mobile.dc.html'), mobileArtboard());
writeFileSync(join(here, 'Holo.dc.html'), holoArtboard());
writeFileSync(join(here, 'canvas.json'), JSON.stringify({
  artboards: [
    { file: 'Main.dc.html', title: 'Desktop · Range rings', x: 0, y: 0, w: 1440, h: 900 },
    { file: 'Destination.dc.html', title: 'Desktop · Can it get there?', x: 1540, y: 0, w: 1440, h: 900 },
    { file: 'Mobile.dc.html', title: 'Mobile', x: 0, y: 1060, w: 390, h: 844 },
    { file: 'Holo.dc.html', title: 'Direction B · Holo (low-fi alternate)', x: 500, y: 1060, w: 1100, h: 700 },
  ],
  annotations: [
    { id: 'direction-note', x: 0, y: -200, w: 560, text: 'Direction A "Neon orbit" (built out here and in the live site): near-black map, neon range rings with glow, frosted-glass panels, Unbounded display type, category icons, a radar sweep at the pin.\nDirection B "Holo" (low-fi, bottom): the same components on light holographic gradients.\n\nThe basemap on these boards is a sketch; the real site uses OpenFreeMap vector tiles (open source, no API key).' },
  ],
  launch: { view: 'canvas' },
}, null, 2));
console.log('wrote artboards');
