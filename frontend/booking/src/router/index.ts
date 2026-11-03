import { createRouter, type RouterHistory } from 'vue-router';
import { destinationBySlug } from '@/content/destinations';
import { useBookingStore } from '@/stores/booking';
import HomeView from '@/views/HomeView.vue';

/**
 * El historial se recibe de afuera: el navegador usa createWebHistory y el
 * prerenderizado (entry-server.ts) usa createMemoryHistory.
 */
export function createAppRouter(history: RouterHistory) {
  return createRouter({
    history,
    // Con ancla (/airport-pickup#terminal-3) la página baja a esa sección; si no, arriba.
    scrollBehavior: (to) => (to.hash ? { el: to.hash, top: 12 } : { top: 0 }),
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
      // Guía para encontrar al chofer en el aeropuerto (enlazada desde los correos y la reserva).
      { path: '/airport-pickup', name: 'airport-pickup', component: () => import('@/views/AirportPickupView.vue') },
      { path: '/terms', name: 'terms', component: () => import('@/views/TermsView.vue') },
      {
        // Una página por destino (ver content/destinations.ts); un destino que no existe regresa al inicio.
        path: '/destinations/:slug',
        name: 'destination',
        component: () => import('@/views/DestinationView.vue'),
        beforeEnter: (to) => (destinationBySlug(to.params.slug) ? true : { name: 'home' }),
      },
      { path: '/privacy', name: 'privacy', component: () => import('@/views/PrivacyView.vue') },
      { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
    ],
  });
}
