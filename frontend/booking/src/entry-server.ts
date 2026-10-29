import { createPinia } from 'pinia';
import { createSSRApp } from 'vue';
import { createMemoryHistory } from 'vue-router';
import { renderToString } from 'vue/server-renderer';
import App from './App.vue';
import { createAppRouter } from './router';
import { seoForRoute } from './seo';

export { headTags, INDEXABLE_PATHS } from './seo';

/**
 * Prerenderizado: devuelve el HTML de una página y su SEO. Lo llama scripts/prerender.mjs
 * al construir el sitio; no corre en el navegador ni en producción.
 */
export async function render(path: string) {
  const router = createAppRouter(createMemoryHistory());
  const app = createSSRApp(App).use(createPinia()).use(router);
  await router.push(path);
  await router.isReady();
  const html = await renderToString(app);
  return { html, seo: seoForRoute(router.currentRoute.value.name, router.currentRoute.value.path) };
}
