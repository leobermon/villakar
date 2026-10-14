import { createRouter, createWebHistory } from 'vue-router';
import { useBookingStore } from '@/stores/booking';
import HomeView from '@/views/HomeView.vue';

export const router = createRouter({
  history: createWebHistory(),
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
    { path: '/contact', name: 'contact', component: () => import('@/views/ContactView.vue') },
    { path: '/terms', name: 'terms', component: () => import('@/views/TermsView.vue') },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
});
