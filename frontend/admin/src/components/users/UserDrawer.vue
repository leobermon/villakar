<script setup lang="ts">
import { computed, reactive, ref, useId, watch } from 'vue';
import BaseDrawer from '@/components/ui/BaseDrawer.vue';
import FormField from '@/components/ui/FormField.vue';
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue';
import { MIN_PASSWORD, ROLE_HINT, ROLE_LABEL, ROLE_ORDER } from '@/config/users';
import { useAuthStore, type UserRole } from '@/stores/auth';
import { useUsersStore } from '@/stores/users';
import type { UserUpdate } from '@/types/user';
import { inputClass, primaryButton, secondaryButton } from '@/utils/formStyles';

/**
 * Alta ('new') o edición (id) de un usuario del panel. El rol solo se guarda por ahora:
 * las reglas de qué puede hacer cada rol se definen más adelante.
 */
const props = defineProps<{ target: 'new' | number | null }>();
const emit = defineEmits<{ close: [] }>();

const store = useUsersStore();
const auth = useAuthStore();

const isNew = computed(() => props.target === 'new');
const user = computed(() => (typeof props.target === 'number' ? store.find(props.target) : undefined));
const open = computed(() => isNew.value || Boolean(user.value));
const isSelf = computed(() => Boolean(user.value) && user.value!.id === auth.user?.id);

/** Solo un superadministrador asigna ese rol (el backend lo valida igual). */
const roleOptions = computed(() => ROLE_ORDER.filter((role) => role !== 'SUPER_ADMIN' || auth.user?.role === 'SUPER_ADMIN'));
/** Un administrador no puede tocar a un superadministrador. */
const locked = computed(() => user.value?.role === 'SUPER_ADMIN' && auth.user?.role !== 'SUPER_ADMIN');

const form = reactive({ name: '', email: '', role: 'OPERATOR' as UserRole, isActive: true, password: '', confirm: '' });
const errors = reactive<Record<string, string | null>>({});
const saving = ref(false);
const saveError = ref<string | null>(null);
const saved = ref(false);
const showPassword = ref(false);
const ids = { name: useId(), email: useId(), role: useId(), password: useId(), confirm: useId() };

function reset() {
  const current = user.value;
  Object.assign(form, {
    name: current?.name ?? '',
    email: current?.email ?? '',
    role: current?.role ?? 'OPERATOR',
    isActive: current?.isActive ?? true,
    password: '',
    confirm: '',
  });
  for (const key of Object.keys(errors)) errors[key] = null;
  saveError.value = null;
  saved.value = false;
  showPassword.value = false;
}
watch(() => [props.target, Boolean(user.value)], reset, { immediate: true });

function validate(): boolean {
  errors.name = form.name.trim() ? null : 'Escribe el nombre del usuario.';
  errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()) ? null : 'Escribe un correo válido.';
  const needsPassword = isNew.value || form.password.length > 0;
  errors.password = !needsPassword || form.password.length >= MIN_PASSWORD ? null : `Debe tener al menos ${MIN_PASSWORD} caracteres.`;
  errors.confirm = !needsPassword || form.password === form.confirm ? null : 'Las contraseñas no coinciden.';
  return !Object.values(errors).some(Boolean);
}

const dirty = computed(() => {
  const current = user.value;
  if (!current) return true;
  return (
    form.name.trim() !== current.name ||
    form.email.trim().toLowerCase() !== current.email ||
    form.role !== current.role ||
    form.isActive !== current.isActive ||
    form.password.length > 0
  );
});

async function save() {
  if (saving.value || !validate()) return;
  saving.value = true;
  saveError.value = null;
  saved.value = false;
  try {
    if (isNew.value) {
      await store.create({ name: form.name.trim(), email: form.email.trim(), role: form.role, password: form.password });
      emit('close');
      return;
    }
    const current = user.value!;
    const changes: UserUpdate = {};
    if (form.name.trim() !== current.name) changes.name = form.name.trim();
    if (form.email.trim().toLowerCase() !== current.email) changes.email = form.email.trim();
    if (form.role !== current.role) changes.role = form.role;
    if (form.isActive !== current.isActive) changes.isActive = form.isActive;
    if (form.password) changes.password = form.password;
    await store.update(current.id, changes);
    form.password = '';
    form.confirm = '';
    saved.value = true;
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'No se pudo guardar.';
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <BaseDrawer
    :open="open"
    :title="isNew ? 'Nuevo usuario' : (user?.name ?? '')"
    :subtitle="isNew ? 'Podrá entrar al panel con su correo y la contraseña que le pongas.' : user?.email"
    @close="emit('close')"
  >
    <form class="space-y-4" novalidate @submit.prevent="save">
      <p v-if="locked" role="status" class="rounded-lg bg-mist-100 px-3 py-2 text-sm text-brand-900">
        Solo un superadministrador puede modificar a otro superadministrador.
      </p>

      <fieldset class="space-y-4" :disabled="locked">
        <FormField label="Nombre" :error="errors.name" v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.name" :aria-describedby="describedBy" :aria-invalid="invalid" maxlength="120" autocomplete="off" :class="inputClass(invalid)" />
        </FormField>

        <FormField label="Correo" :error="errors.email" hint="Con este correo entra al panel." v-slot="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.email" type="email" :aria-describedby="describedBy" :aria-invalid="invalid" maxlength="190" autocomplete="off" :class="inputClass(invalid)" />
        </FormField>

        <FormField label="Rol" :hint="ROLE_HINT[form.role]" v-slot="{ id, describedBy }">
          <select :id="id" v-model="form.role" :aria-describedby="describedBy" :disabled="isSelf" :class="inputClass()">
            <option v-for="role in roleOptions" :key="role" :value="role">{{ ROLE_LABEL[role] }}</option>
            <!-- Un administrador ve (sin poder elegirlo) el rol actual de un superadministrador. -->
            <option v-if="!roleOptions.includes(form.role)" :value="form.role">{{ ROLE_LABEL[form.role] }}</option>
          </select>
          <p class="mt-1 text-xs text-brand-900/55">Por ahora el rol solo se guarda; los permisos de cada rol se definirán más adelante.</p>
        </FormField>

        <div class="space-y-4 rounded-xl border border-fog-200 p-4">
          <p class="text-sm font-semibold text-brand-950">{{ isNew ? 'Contraseña' : 'Restablecer contraseña' }}</p>
          <p v-if="!isNew" class="-mt-2 text-xs text-brand-900/60">Déjala vacía para no cambiarla.</p>
          <FormField label="Contraseña" :error="errors.password" :hint="`Al menos ${MIN_PASSWORD} caracteres.`" v-slot="{ id, describedBy, invalid }">
            <div class="flex gap-2">
              <input
                :id="id"
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                :aria-describedby="describedBy"
                :aria-invalid="invalid"
                maxlength="200"
                autocomplete="new-password"
                :class="inputClass(invalid)"
              />
              <button type="button" :class="[secondaryButton, 'shrink-0 px-3']" @click="showPassword = !showPassword">
                {{ showPassword ? 'Ocultar' : 'Ver' }}
              </button>
            </div>
          </FormField>
          <FormField label="Repetir contraseña" :error="errors.confirm" v-slot="{ id, describedBy, invalid }">
            <input
              :id="id"
              v-model="form.confirm"
              :type="showPassword ? 'text' : 'password'"
              :aria-describedby="describedBy"
              :aria-invalid="invalid"
              maxlength="200"
              autocomplete="new-password"
              :class="inputClass(invalid)"
            />
          </FormField>
        </div>

        <div v-if="!isNew" class="flex items-center justify-between gap-4 rounded-xl border border-fog-200 p-4">
          <div>
            <p class="text-sm font-semibold text-brand-950">Usuario activo</p>
            <p class="text-xs text-brand-900/60">
              {{ isSelf ? 'No puedes desactivar tu propio usuario.' : 'Si lo desactivas, pierde el acceso de inmediato.' }}
            </p>
          </div>
          <ToggleSwitch v-model="form.isActive" label="Usuario activo" :disabled="isSelf" />
        </div>
      </fieldset>

      <p v-if="saveError" role="alert" class="text-sm font-medium text-accent-600">{{ saveError }}</p>
      <p v-else-if="saved && !dirty" role="status" class="text-sm font-medium text-emerald-700">Cambios guardados.</p>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <button type="button" :class="secondaryButton" @click="emit('close')">{{ isNew ? 'Cancelar' : 'Cerrar' }}</button>
        <button type="button" :class="primaryButton" :disabled="saving || locked || !dirty" @click="save">
          {{ saving ? 'Guardando…' : isNew ? 'Crear usuario' : 'Guardar cambios' }}
        </button>
      </div>
    </template>
  </BaseDrawer>
</template>
