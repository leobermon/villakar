/**
 * Genera las versiones WebP de las fotos del sitio en varios anchos (800, 1280…), junto al JPG original.
 * El navegador escoge la que le toca (un celular baja la chica, una pantalla grande la grande) y el JPG
 * queda de respaldo. También escribe src/content/imageVariants.json con los anchos disponibles de cada foto.
 *
 * Uso: node scripts/build-image-variants.mjs   (hay que correrlo de nuevo si se agrega o cambia una foto)
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(root, 'public');

/** Carpeta -> anchos que se generan (nunca más grandes que la foto original) y calidad WebP. */
const FOLDERS = [
  { dir: 'hero', widths: [640, 1024, 1600], quality: 72 },
  { dir: 'destinations', widths: [480, 800, 1000], quality: 74 },
  { dir: 'services', widths: [480, 800, 1000], quality: 74 },
  { dir: 'destinations/photos', widths: [480, 800, 1280], quality: 74 },
];

const manifest = {};

for (const { dir, widths, quality } of FOLDERS) {
  for (const file of fs.readdirSync(path.join(publicDir, dir)).sort()) {
    if (!/\.jpe?g$/i.test(file)) continue;
    const source = path.join(publicDir, dir, file);
    const { width: original } = await sharp(source).metadata();
    const sizes = [...new Set(widths.map((w) => Math.min(w, original)))];
    const base = file.replace(/\.jpe?g$/i, '');
    for (const w of sizes) {
      await sharp(source).resize({ width: w }).webp({ quality, effort: 5 }).toFile(path.join(publicDir, dir, `${base}-${w}.webp`));
    }
    manifest[`/${dir}/${file}`] = sizes;
  }
}

fs.writeFileSync(path.join(root, 'src/content/imageVariants.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${Object.keys(manifest).length} fotos con versiones WebP`);
