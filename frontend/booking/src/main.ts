import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { createWebHistory } from 'vue-router';
import App from './App.vue';
import { initAnalytics, trackPageView } from './analytics';
import { createAppRouter } from './router';
import { applySeo } from './seo';
import { initTracker, trackEvent } from './tracker';
import './style.css';

const router = createAppRouter(createWebHistory());

initAnalytics();
initTracker();

// Título y etiquetas de cada página (el HTML prerenderizado ya trae las de la página de entrada).
router.afterEach((to) => {
  applySeo(to.name, to.path);
  // La reserva lleva su código en la URL: se registra sin él para no filtrar datos del cliente a GA.
  const safePath = to.name === 'reservation' ? '/reservation' : to.name === 'paylink' ? '/pay' : to.path;
  trackPageView(safePath);
  trackEvent('page_view', { path: safePath });
});

createApp(App).use(createPinia()).use(router).mount('#app');
