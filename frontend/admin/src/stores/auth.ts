import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { api } from '@/api/client';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'OPERATOR';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export const ROLE_LABEL: Record<UserRole, string> = {
  SUPER_ADMIN: 'Superadministrador',
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
};

/** Sesión del panel. La sesión vive en una cookie httpOnly; aquí solo el usuario actual. */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<AdminUser | null>(null);
  /** Ya se preguntó al backend si hay sesión (al abrir el panel). */
  const checked = ref(false);

  /** Puede modificar catálogo y precios (los operadores solo operan órdenes). */
  const canEditCatalog = computed(() => user.value?.role === 'SUPER_ADMIN' || user.value?.role === 'ADMIN');

  async function restore(): Promise<AdminUser | null> {
    if (checked.value) return user.value;
    try {
      user.value = await api<AdminUser>('/admin/auth/me', { silent401: true });
    } catch {
      user.value = null;
    }
    checked.value = true;
    return user.value;
  }

  async function login(email: string, password: string) {
    user.value = await api<AdminUser>('/admin/auth/login', { method: 'POST', json: { email, password }, silent401: true });
    checked.value = true;
  }

  async function logout() {
    try {
      await api('/admin/auth/logout', { method: 'POST' });
    } finally {
      user.value = null;
    }
  }

  /** La sesión venció en el servidor (respuesta 401). */
  function expire() {
    user.value = null;
  }

  return { user, checked, canEditCatalog, restore, login, logout, expire };
});
