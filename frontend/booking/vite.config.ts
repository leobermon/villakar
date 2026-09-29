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
    port: 5173,
    // Escucha en la red local para probar desde el teléfono (http://<IP de la PC>:5173).
    host: true,
    // En desarrollo el navegador llama a /api y Vite lo reenvía al backend NestJS.
    proxy: { '/api': 'http://localhost:3000' },
  },
});
