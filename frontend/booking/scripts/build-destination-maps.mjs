/**
 * Genera los mapas de las páginas de destino: public/destinations/maps/*.webp y src/content/destinationMaps.ts.
 *
 *   npm install sharp --no-save        (una sola vez; no es dependencia del proyecto)
 *   node scripts/build-destination-maps.mjs
 *
 * Cada mapa es una imagen hecha con mosaicos de OpenStreetMap (© colaboradores de OpenStreetMap, licencia ODbL),
 * con la ruta en carretera calculada por OSRM. Descarga unas 20 piezas por mapa, con pausa entre peticiones.
 * No se corre en cada build: solo cuando se agrega o se cambia un destino. Los mosaicos se guardan en
 * .map-tiles/ (ignorado por git) para no volver a pedirlos.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(root, 'public/destinations/maps');
const CACHE = path.join(root, '.map-tiles');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(CACHE, { recursive: true });

/** [longitud, latitud] */
const AIRPORT = [-86.8747, 21.0381];
const DESTS = {
  cancun: [-86.766, 21.07],
  'puerto-morelos': [-86.8742, 20.8497],
  'playa-del-carmen': [-87.0739, 20.6296],
  akumal: [-87.3144, 20.3944],
  tulum: [-87.4654, 20.2114],
};

const UA = { 'User-Agent': 'VillakarTransfersStaticMaps/1.0 (reservations@villakartransfers.com)' };
const W = 900;
const PAD = 110;

/** Píxeles del mapa del mundo (proyección Web Mercator) para un nivel de zoom. */
function world(lng, lat, z) {
  const n = 256 * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lng + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tile(z, x, y) {
  const file = path.join(CACHE, `osm-${z}-${x}-${y}.png`);
  if (!fs.existsSync(file)) {
    const response = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, { headers: UA });
    if (!response.ok) throw new Error(`tile ${z}/${x}/${y} -> ${response.status}`);
    fs.writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    await sleep(300);
  }
  return file;
}

/** Ramer–Douglas–Peucker: quita puntos de la ruta que no cambian el trazo a la vista. */
function simplify(points, epsilon) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let max = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const distance =
      Math.abs((b[1] - a[1]) * x - (b[0] - a[0]) * y + b[0] * a[1] - b[1] * a[0]) / (Math.hypot(b[1] - a[1], b[0] - a[0]) || 1);
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  if (max > epsilon) return [...simplify(points.slice(0, index + 1), epsilon).slice(0, -1), ...simplify(points.slice(index), epsilon)];
  return [a, b];
}

const result = {};
for (const [slug, dest] of Object.entries(DESTS)) {
  const url = `https://router.project-osrm.org/route/v1/driving/${AIRPORT.join(',')};${dest.join(',')}?overview=full&geometries=geojson`;
  const route = (await (await fetch(url, { headers: UA })).json()).routes[0];
  const coords = route.geometry.coordinates;

  // Encuadre: la ruta ocupa el mapa con margen para las etiquetas; las rutas largas usan una imagen más alta.
  const base = coords.map(([lng, lat]) => world(lng, lat, 0));
  const xs = base.map((p) => p[0]);
  const ys = base.map((p) => p[1]);
  const spanX = Math.max(...xs) - Math.min(...xs);
  const spanY = Math.max(...ys) - Math.min(...ys);
  const H = Math.round(Math.min(1100, Math.max(620, ((W * spanY) / Math.max(spanX, 1e-9)) * 0.95)));
  let z = 15;
  while (z > 5 && (spanX * 2 ** z > W - 2 * PAD || spanY * 2 ** z > H - 2 * PAD)) z--;

  const left = ((Math.max(...xs) + Math.min(...xs)) / 2) * 2 ** z - W / 2;
  const top = ((Math.max(...ys) + Math.min(...ys)) / 2) * 2 ** z - H / 2;
  const tx0 = Math.floor(left / 256);
  const tx1 = Math.floor((left + W) / 256);
  const ty0 = Math.floor(top / 256);
  const ty1 = Math.floor((top + H) / 256);

  const pieces = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) pieces.push({ input: await tile(z, tx, ty), left: (tx - tx0) * 256, top: (ty - ty0) * 256 });
  }
  const mosaic = await sharp({
    create: { width: (tx1 - tx0 + 1) * 256, height: (ty1 - ty0 + 1) * 256, channels: 3, background: '#e8eef2' },
  })
    .composite(pieces)
    .png()
    .toBuffer();
  // Colores un poco más calmados que los de OpenStreetMap, para que la ruta y las etiquetas resalten.
  await sharp(mosaic)
    .extract({ left: Math.round(left - tx0 * 256), top: Math.round(top - ty0 * 256), width: W, height: H })
    .modulate({ saturation: 0.7, brightness: 1.06 })
    .webp({ quality: 80 })
    .toFile(path.join(OUT, `${slug}.webp`));

  // Posiciones en píxeles de la imagen recortada.
  const toPixel = ([lng, lat]) => {
    const [x, y] = world(lng, lat, z);
    return [x - Math.round(left), y - Math.round(top)];
  };
  const points = simplify(coords.map(toPixel), 1.1);
  result[slug] = {
    file: `${slug}.webp`,
    width: W,
    height: H,
    route: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' '),
    airport: points[0].map((v) => +v.toFixed(1)),
    dest: points[points.length - 1].map((v) => +v.toFixed(1)),
    km: Math.round(route.distance / 1000),
    minutes: Math.round(route.duration / 60),
  };
  console.log(`${slug}: ${W}x${H}, zoom ${z}, ${(route.distance / 1000).toFixed(1)} km, ${(route.duration / 60).toFixed(0)} min, ${pieces.length} piezas`);
}

// ---- src/content/destinationMaps.ts ----
const entries = Object.entries(result)
  .map(
    ([slug, v]) => `  '${slug}': {
    file: '${v.file}',
    width: ${v.width},
    height: ${v.height},
    route: '${v.route}',
    airport: [${v.airport.join(', ')}],
    dest: [${v.dest.join(', ')}],
    km: ${v.km},
    minutes: ${v.minutes},
  },`,
  )
  .join('\n');

fs.writeFileSync(
  path.join(root, 'src/content/destinationMaps.ts'),
  `/**
 * Mapas de las páginas de destino. ARCHIVO GENERADO por scripts/build-destination-maps.mjs: no se edita a mano.
 * Cada mapa es una imagen (public/destinations/maps) hecha con mosaicos de OpenStreetMap, y la ruta real en carretera
 * (calculada con OSRM) va dibujada encima, en las mismas coordenadas de la imagen.
 */
export interface DestinationMap {
  /** Archivo dentro de public/destinations/maps. */
  file: string;
  width: number;
  height: number;
  /** Ruta en carretera, como trazo SVG en píxeles de la imagen. */
  route: string;
  /** Posición del aeropuerto y del destino en la imagen. */
  airport: [number, number];
  dest: [number, number];
  /** Datos de la ruta calculada (sin tráfico). */
  km: number;
  minutes: number;
}

export const DESTINATION_MAPS: Record<string, DestinationMap> = {
${entries}
};
`,
);
