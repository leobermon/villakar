import { createRouter, createWebHistory } from 'vue-router';
import { setUnauthorizedHandler } from '@/api/client';
import { NAVIGATION } from '@/config/navigation';
import { useAuthStore } from '@/stores/auth';

declare module 'vue-router' {
  interface RouteMeta {
    /** Título en el header y en la pestaña del navegador. */
    title: string;
    /** Accesible sin sesión (solo el login). */
    public?: boolean;
  }
}

// Módulos del menú que aún no existen: todos apuntan a la misma vista "Pronto".
const upcoming = NAVIGATION.flatMap((group) => group.items)
  .filter((item) => !item.ready)
  .map((item) => ({
    path: `/${item.name}`,
    name: item.name,
    component: () => import('@/views/ComingSoonView.vue'),
    meta: { title: item.label },
  }));

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { title: 'Iniciar sesión', public: true } },
    { path: '/', redirect: { name: 'orders' } },
    { path: '/orders', name: 'orders', component: () => import('@/views/orders/OrdersView.vue'), meta: { title: 'Órdenes' } },
    {
      path: '/payments',
      name: 'payments',
      component: () => import('@/views/payments/PaymentsView.vue'),
      meta: { title: 'Pagos' },
    },
    {
      path: '/emails',
      name: 'emails',
      component: () => import('@/views/emails/EmailsView.vue'),
      meta: { title: 'Correos' },
    },
    {
      path: '/contacts',
      name: 'contacts',
      component: () => import('@/views/contacts/ContactsView.vue'),
      meta: { title: 'Mensajes' },
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('@/views/users/UsersView.vue'),
      meta: { title: 'Usuarios' },
    },
    { path: '/rates', name: 'rates', component: () => import('@/views/rates/RatesView.vue'), meta: { title: 'Tarifas' } },
    {
      path: '/vehicles',
      name: 'vehicles',
      component: () => import('@/views/vehicles/VehiclesView.vue'),
      meta: { title: 'Vehículos' },
    },
    { path: '/zones', name: 'zones', component: () => import('@/views/zones/ZonesView.vue'), meta: { title: 'Zonas' } },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('@/views/settings/SettingsView.vue'),
      meta: { title: 'Configuración' },
    },
    ...upcoming,
    { path: '/:pathMatch(.*)*', redirect: { name: 'orders' } },
  ],
});

// Todo el panel exige sesión salvo el login.
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  const user = await auth.restore();
  if (to.meta.public) return user && to.name === 'login' ? { path: '/' } : true;
  if (!user) return { name: 'login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} };
  return true;
});

// Si el backend responde 401 a mitad de uso (sesión vencida), de vuelta al login.
setUnauthorizedHandler(() => {
  const auth = useAuthStore();
  if (!auth.user) return;
  auth.expire();
  const current = router.currentRoute.value;
  if (!current.meta.public) router.replace({ name: 'login', query: { redirect: current.fullPath, expired: '1' } });
});

router.afterEach((to, _from, failure) => {
  // Si la navegación se canceló (p. ej. cambios sin guardar), el título no cambia.
  if (!failure) document.title = `${to.meta.title} · Panel VillaKar`;
});
