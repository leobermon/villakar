<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { EMAIL_KINDS_BY_STATUS, EMAIL_KIND_LABEL, EMAIL_KIND_ORDER, EMAIL_KIND_WHEN } from '@/config/messages';
import { useMessagesStore } from '@/stores/messages';
import type { EmailKind, EmailLog } from '@/types/messages';
import type { OrderStatus } from '@/types/order';
import { formatInstant } from '@/utils/format';

/**
 * Historial de correos de una orden: qué correos del cliente ya salieron (reserva recibida,
 * confirmación, agradecimiento y cancelación), cuándo, y si alguno falló. Cada fila permite
 * reenviar el correo si corresponde al estado actual de la orden, previa confirmación.
 */
const props = defineProps<{ orderId: number; status: OrderStatus; customerEmail: string }>();

const store = useMessagesStore();
const loading = ref(true);
const loadError = ref<string | null>(null);
const resending = ref<EmailKind | null>(null);
/** Correo cuyo envío espera confirmación ("¿Estás seguro?"), en la misma fila. */
const confirming = ref<EmailKind | null>(null);
const result = ref<{ kind: EmailKind; ok: boolean; text: string } | null>(null);

async function load() {
  loadError.value = null;
  try {
    await store.loadOrderEmails(props.orderId);
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'No se pudo cargar el historial de correos.';
  } finally {
    loading.value = false;
  }
}

// Al abrir otra orden, o cuando cambia su estado (al cambiarlo sale un correo), se vuelve a leer.
watch(
  () => [props.orderId, props.status],
  () => {
    result.value = null;
    confirming.value = null;
    load();
  },
  { immediate: true },
);

const logs = computed<EmailLog[]>(() => store.orderEmails[props.orderId] ?? []);

/** Una fila por tipo de correo, con su intento más reciente. */
const rows = computed(() =>
  EMAIL_KIND_ORDER.map((kind) => {
    const attempts = logs.value.filter((log) => log.kind === kind);
    return {
      kind,
      latest: attempts[0] ?? null, // vienen del más reciente al más antiguo
      attempts: attempts.length,
      canResend: EMAIL_KINDS_BY_STATUS[props.status].includes(kind),
    };
  }),
);

async function resend(kind: EmailKind) {
  if (resending.value) return;
  confirming.value = null;
  resending.value = kind;
  result.value = null;
  try {
    const outcome = await store.resendEmail(props.orderId, kind);
    result.value = outcome.sent
      ? { kind, ok: true, text: `Enviado a ${props.customerEmail}.` }
      : { kind, ok: false, text: outcome.error ?? 'No se pudo enviar el correo.' };
  } catch (e) {
    result.value = { kind, ok: false, text: e instanceof Error ? e.message : 'No se pudo enviar el correo.' };
  } finally {
    resending.value = null;
  }
}
</script>

<template>
  <div>
    <p class="mb-1.5 text-[11px] text-brand-900/60">Se envían a <span class="font-medium text-brand-950">{{ props.customerEmail }}</span></p>
    <p v-if="loadError" role="alert" class="text-xs font-medium text-accent-600">{{ loadError }}</p>
    <p v-else-if="loading" class="text-xs text-brand-900/60" role="status">Cargando correos…</p>

    <ul v-else class="divide-y divide-fog-200 rounded-lg border border-fog-200 text-xs">
      <li v-for="row in rows" :key="row.kind" class="px-3 py-1.5">
        <div class="flex items-center justify-between gap-2">
          <div class="min-w-0 truncate">
            <span class="font-semibold text-brand-950">{{ EMAIL_KIND_LABEL[row.kind] }}</span>
            <span v-if="row.latest" class="ml-1.5 text-brand-900/55">
              {{ formatInstant(row.latest.createdAt) }}<template v-if="row.attempts > 1"> · ×{{ row.attempts }}</template>
            </span>
            <span v-else class="ml-1.5 text-brand-900/45">{{ EMAIL_KIND_WHEN[row.kind] }}</span>
          </div>

          <div class="flex shrink-0 items-center gap-2">
            <span
              class="inline-flex items-center gap-1 font-semibold whitespace-nowrap"
              :class="!row.latest ? 'text-brand-900/45' : row.latest.status === 'SENT' ? 'text-emerald-700' : 'text-accent-600'"
            >
              <span
                class="size-1.5 rounded-full"
                :class="!row.latest ? 'bg-brand-900/30' : row.latest.status === 'SENT' ? 'bg-emerald-500' : 'bg-accent-500'"
                aria-hidden="true"
              />
              {{ !row.latest ? 'No enviado' : row.latest.status === 'SENT' ? 'Enviado' : 'Falló' }}
            </span>
            <button
              v-if="row.canResend && confirming !== row.kind"
              type="button"
              class="h-6 rounded-md border border-brand-300 bg-white px-2 text-[11px] font-semibold whitespace-nowrap text-brand-700 hover:bg-brand-50 disabled:opacity-60"
              :disabled="resending !== null"
              :aria-label="`${row.latest ? 'Reenviar' : 'Enviar'} ${EMAIL_KIND_LABEL[row.kind]}`"
              @click="confirming = row.kind"
            >
              {{ resending === row.kind ? 'Enviando…' : row.latest ? 'Reenviar' : 'Enviar' }}
            </button>
          </div>
        </div>

        <!-- Confirmación en la misma fila (sin ventanas emergentes). -->
        <div
          v-if="confirming === row.kind"
          role="alertdialog"
          :aria-label="`Confirmar ${row.latest ? 'reenvío' : 'envío'} de ${EMAIL_KIND_LABEL[row.kind]}`"
          class="mt-1.5 flex flex-wrap items-center justify-between gap-2 rounded-md bg-amber-50 px-2.5 py-1.5"
        >
          <p class="text-[11px] font-medium text-amber-900">
            ¿Estás seguro de {{ row.latest ? 'reenviar' : 'enviar' }} este correo a {{ props.customerEmail }}?
          </p>
          <div class="flex gap-1.5">
            <button type="button" class="h-6 rounded-md bg-brand-600 px-2.5 text-[11px] font-semibold text-white hover:bg-brand-700" @click="resend(row.kind)">
              Sí, {{ row.latest ? 'reenviar' : 'enviar' }}
            </button>
            <button type="button" class="h-6 rounded-md px-2.5 text-[11px] font-semibold text-brand-900 hover:bg-amber-100" @click="confirming = null">
              No
            </button>
          </div>
        </div>

        <p v-if="row.latest?.error && !(result && result.kind === row.kind)" class="mt-0.5 truncate text-[11px] text-accent-600" :title="row.latest.error">
          {{ row.latest.error }}
        </p>
        <p
          v-if="result && result.kind === row.kind"
          role="status"
          class="mt-0.5 text-[11px] font-medium"
          :class="result.ok ? 'text-emerald-700' : 'text-accent-600'"
        >
          {{ result.text }}
        </p>
      </li>
    </ul>
  </div>
</template>
