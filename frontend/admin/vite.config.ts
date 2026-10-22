import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

// Versión del panel: la de package.json y, si hay git, el commit (en el build de Docker puede no haber).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };
let commit = '';
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
} catch {
  // Sin git: se muestra solo la versión.
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(commit ? `${version} (${commit})` : version) },
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    // 5174: el backend ya lo permite en CORS_ORIGINS para el panel.
    port: 5174,
    host: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
