import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { ApiError, api } from '@/api/client';
import type { ManagedUser, NewUser, UserUpdate } from '@/types/user';

/** Usuarios que entran al panel (/api/admin/users). */
export const useUsersStore = defineStore('users', () => {
  const users = ref<ManagedUser[]>([]);
  const loading = ref(false);
  const loaded = ref(false);
  const loadError = ref<string | null>(null);

  async function load(force = false) {
    if ((loaded.value && !force) || loading.value) return;
    loading.value = true;
    loadError.value = null;
    try {
      users.value = await api<ManagedUser[]>('/admin/users');
      loaded.value = true;
    } catch (e) {
      loadError.value = e instanceof ApiError ? e.message : 'No se pudieron cargar los usuarios.';
    } finally {
      loading.value = false;
    }
  }

  async function create(data: NewUser): Promise<ManagedUser> {
    const created = await api<ManagedUser>('/admin/users', { method: 'POST', json: data });
    users.value = [...users.value, created];
    return created;
  }

  async function update(id: number, changes: UserUpdate): Promise<ManagedUser> {
    const updated = await api<ManagedUser>(`/admin/users/${id}`, { method: 'PATCH', json: changes });
    users.value = users.value.map((user) => (user.id === id ? updated : user));
    return updated;
  }

  const activeCount = computed(() => users.value.filter((user) => user.isActive).length);

  function find(id: number): ManagedUser | undefined {
    return users.value.find((user) => user.id === id);
  }

  return { users, loading, loadError, activeCount, load, create, update, find };
});
