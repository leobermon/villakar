/**
 * Prerenderizado del sitio de reservas (se ejecuta al final de `npm run build`).
 *
 * El sitio es una aplicación Vue que se dibuja en el navegador, así que el HTML que recibe
 * Google estaría vacío. Aquí se genera el HTML ya escrito (con su título, descripción y
 * etiquetas) de las páginas públicas: la portada, /contact y /terms. Al abrirlas, Vue toma
 * el control y todo funciona igual que antes.
 *
 * Salida: dist/index.html (portada), dist/contact.html y dist/terms.html. Caddy sirve
 * /contact con dist/contact.html (ver deploy/web/Caddyfile).
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const origin = process.env.VITE_PUBLIC_SITE_URL || 'https://villakartransfers.com';

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const { render, headTags, INDEXABLE_PATHS } = await import(
  pathToFileURL(path.join(root, 'dist-server', 'entry-server.js')).href
);

for (const route of INDEXABLE_PATHS) {
  const { html, seo } = await render(route);
  const tags = headTags(seo, origin, route);

  const page = template
    // Se quitan el título y la descripción genéricos: cada página trae los suyos.
    .replace(/<title>[\s\S]*?<\/title>\s*/, '')
    .replace(/<meta\s+name="description"[\s\S]*?\/>\s*/, '')
    .replace('</head>', `    ${tags}\n  </head>`)
    .replace('<div id="app"></div>', `<div id="app">${html}</div>`);

  if (!page.includes(html.slice(0, 40))) throw new Error(`No se pudo escribir el contenido de ${route}`);

  const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  fs.writeFileSync(path.join(dist, file), page);
  console.log(`Prerenderizado ${route} -> dist/${file} (${Math.round(page.length / 1024)} KB)`);
}
