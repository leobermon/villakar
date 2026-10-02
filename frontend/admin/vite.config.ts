import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
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
