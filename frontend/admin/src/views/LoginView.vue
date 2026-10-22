<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ApiError } from '@/api/client';
import FormField from '@/components/ui/FormField.vue';
import { useAuthStore } from '@/stores/auth';
import { inputClass, primaryButton } from '@/utils/formStyles';

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = ref('');
const password = ref('');
const error = ref<string | null>(null);
const sending = ref(false);
const expired = route.query.expired === '1';

async function submit() {
  if (!email.value.trim() || !password.value) {
    error.value = 'Escribe tu correo y tu contraseña.';
    return;
  }
  sending.value = true;
  error.value = null;
  try {
    await auth.login(email.value.trim(), password.value);
    // Solo rutas internas del panel (evita redirigir a sitios externos).
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') && !route.query.redirect.startsWith('//') ? route.query.redirect : '/';
    await router.replace(redirect);
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.';
    password.value = '';
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-fog-50 px-4 py-10">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center gap-1">
        <img src="/logo.png" alt="VillaKar Transfers" width="958" height="410" class="h-20 w-auto" />
        <p class="text-xs text-brand-900/60">Panel de administración</p>
      </div>

      <form class="space-y-4 rounded-2xl border border-fog-200 bg-white p-6" novalidate @submit.prevent="submit">
        <h1 class="text-lg font-bold">Iniciar sesión</h1>
        <p v-if="expired" class="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">Tu sesión venció. Vuelve a entrar.</p>

        <FormField v-slot="{ id }" label="Correo">
          <input :id="id" v-model="email" type="email" autocomplete="username" maxlength="190" :class="inputClass(Boolean(error))" />
        </FormField>
        <FormField v-slot="{ id }" label="Contraseña">
          <input :id="id" v-model="password" type="password" autocomplete="current-password" maxlength="200" :class="inputClass(Boolean(error))" />
        </FormField>

        <p v-if="error" role="alert" class="text-sm font-medium text-accent-600">{{ error }}</p>

        <button type="submit" :class="primaryButton" class="w-full" :disabled="sending">{{ sending ? 'Entrando…' : 'Entrar' }}</button>
      </form>
    </div>
  </main>
</template>
