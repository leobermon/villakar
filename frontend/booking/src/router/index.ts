import { createRouter, type RouterHistory } from 'vue-router';
import { useBookingStore } from '@/stores/booking';
import HomeView from '@/views/HomeView.vue';

/**
 * El historial se recibe de afuera: el navegador usa createWebHistory y el
 * prerenderizado (entry-server.ts) usa createMemoryHistory.
 */
export function createAppRouter(history: RouterHistory) {
  return createRouter({
    history,
    scrollBehavior: () => ({ top: 0 }),
    routes: [
      { path: '/', name: 'home', component: HomeView },
      {
        path: '/results',
        name: 'results',
        component: () => import('@/views/ResultsView.vue'),
        // Sin cotización (p. ej. al recargar) se regresa al buscador.
        beforeEnter: () => (useBookingStore().quote ? true : { name: 'home' }),
      },
      // El checkout ahora vive dentro de /results (vehículo + datos + pago).
      { path: '/checkout', redirect: { name: 'results' } },
      {
        // Página de la reserva: regreso desde Stripe / PayPal, confirmación y reintento de pago.
        path: '/reservation/:code([A-Za-z0-9]{10})',
        name: 'reservation',
        component: () => import('@/views/ReservationView.vue'),
      },
      {
        // Link de pago que el equipo le manda al cliente.
        path: '/pay/:token([A-Za-z0-9_-]{6,32})',
        name: 'paylink',
        component: () => import('@/views/PayLinkView.vue'),
      },
      { path: '/contact', name: 'contact', component: () => import('@/views/ContactView.vue') },
      { path: '/faq', name: 'faq', component: () => import('@/views/FaqView.vue') },
      { path: '/terms', name: 'terms', component: () => import('@/views/TermsView.vue') },
      { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
      { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
    ],
  });
}
