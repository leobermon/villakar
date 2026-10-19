import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createWebHistory } from 'vue-router';
import App from './App.vue';
import { createAppRouter } from './router';
import { applySeo } from './seo';
import './style.css';

const router = createAppRouter(createWebHistory());

// Título y etiquetas de cada página (el HTML prerenderizado ya trae las de la página de entrada).
router.afterEach((to) => applySeo(to.name, to.path));

createApp(App).use(createPinia()).use(router).mount('#app');
