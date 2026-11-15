<script setup lang="ts">
import { computed, onMounted, reactive, ref, useId } from 'vue';
import { ApiError, api } from '@/api/client';
import LoadErrorBanner from '@/components/ui/LoadErrorBanner.vue';

interface Stats {
  from: string;
  to: string;
  totalEvents: number;
  funnel: {
    visits: number;
    hotelChosen: number;
    quotes: number;
    priced: number;
    checkout: number;
    startedForm: number;
    submitted: number;
    purchased: number;
    outOfZone: number;
    contactSent: number;
    onlyQuoted: number;
  };
  routes: Array<{ route: string; tripType: string | null; count: number }>;
  hotels: Array<{ hotel: string; searches: number; visitors: number; arrivals: number; departures: number; priced: number; avgFrom: number | null }>;
  clicks: Array<{ label: string; clicks: number; visitors: number }>;
  fields: Array<{ label: string; visitors: number }>;
  vehicles: Array<{ label: string; count: number }>;
  daily: Array<{ day: string; visits: number; quotes: number; bookings: number }>;
  sources: Array<{ label: string; visitors: number }>;
  devices: Array<{ label: string; visitors: number }>;
  countries: Array<{ country: string; visits: number; quotes: number }>;
  cities: Array<{ country: string; city: string; visits: number; quotes: number }>;
  hours: Array<{ hour: number; quotes: number; visits: number }>;
  recent: Array<{
    at: string;
    country: string | null;
    city: string | null;
    tz: string | null;
    route: string | null;
    tripType: string | null;
    hotel: string | null;
    serviceable: boolean;
    amount: number | null;
    passengers: number | null;
    serviceDate: string | null;
    returnDate: string | null;
  }>;
  serviceDates: Array<{ date: string; quotes: number; arrivals: number; departures: number }>;
  serviceMonths: Array<{ month: string; quotes: number }>;
  stays: Array<{ nights: number; quotes: number }>;
}

const ROUTE_LABEL: Record<string, string> = {
  AIRPORT_HOTEL: 'Llegada (aeropuerto → hotel)',
  HOTEL_AIRPORT: 'Salida (hotel → aeropuerto)',
  HOTEL_HOTEL: 'Entre hoteles',
};
const FIELD_LABEL: Record<string, string> = {
  first_name: 'Nombre',
  last_name: 'Apellido',
  email: 'Correo',
  phone: 'Teléfono',
  special_requests: 'Peticiones especiales',
  leg_details: 'Datos del vuelo / recogida',
  payment_or_option: 'Método de pago',
  checkbox: 'Casilla de términos',
};
const DEVICE_LABEL: Record<string, string> = { mobile: 'Celular', desktop: 'Computadora', desconocido: 'Desconocido' };

function clickLabel(label: string): string {
  if (label === 'whatsapp') return 'Botón de WhatsApp';
  if (label === 'phone') return 'Teléfono';
  if (label === 'email') return 'Correo';
  if (label === 'hotel_not_listed') return 'Mi hotel no aparece';
  if (label.startsWith('link:')) return `Enlace a ${label.slice(5)}`;
  if (label.startsWith('external:')) return `Enlace externo: ${label.slice(9)}`;
  return label;
}

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });
/** "🇺🇸 Estados Unidos" a partir del código de país; "Desconocido" si no se pudo ubicar. */
function countryName(code: string | null): string {
  if (!code || code === '??') return 'Desconocido';
  const flag = [...code.toUpperCase()].map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join('');
  try {
    return `${flag} ${regionNames.of(code.toUpperCase()) ?? code}`;
  } catch {
    return code;
  }
}
/** Fecha y hora en horario de Cancún (UTC-5 todo el año). */
function cancunTime(iso: string): string {
  const shifted = new Date(new Date(iso.endsWith('Z') ? iso : `${iso}Z`).getTime() - 5 * 3_600_000);
  const hh = String(shifted.getUTCHours()).padStart(2, '0');
  const mm = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${shifted.toISOString().slice(5, 10).replace('-', '/')} ${hh}:${mm}`;
}
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
/** '2026-12-20' → '20 dic 2026'. */
function shortDate(day: string | null): string {
  if (!day) return '—';
  const [y, m, d] = day.split('-').map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}
function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS[(m ?? 1) - 1]} ${y}`;
}
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

function isoDay(date: Date): string {
  return new Date(date.getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
}

const range = reactive({ from: '', to: '' });
const stats = ref<Stats | null>(null);
const loading = ref(false);
const loadError = ref<string | null>(null);
const ids = { from: useId(), to: useId() };

function setDays(days: number) {
  const now = new Date();
  range.to = isoDay(now);
  range.from = isoDay(new Date(now.getTime() - (days - 1) * 86_400_000));
  void load();
}

async function load() {
  loading.value = true;
  loadError.value = null;
  try {
    const params = new URLSearchParams();
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    stats.value = await api<Stats>(`/admin/site-stats?${params}`);
    range.from = stats.value.from;
    range.to = stats.value.to;
  } catch (e) {
    loadError.value = e instanceof ApiError ? e.message : 'No se pudo cargar la analítica.';
  } finally {
    loading.value = false;
  }
}
onMounted(() => setDays(30));

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const usd = (value: number | null) => (value == null ? '—' : `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`);

/** Pasos del recorrido del cliente, cada uno con el porcentaje que llegó desde las visitas. */
const funnelSteps = computed(() => {
  const f = stats.value?.funnel;
  if (!f) return [];
  return [
    { label: 'Entraron al sitio', value: f.visits },
    { label: 'Eligieron un hotel', value: f.hotelChosen },
    { label: 'Pidieron precio', value: f.quotes },
    { label: 'Recibieron precio', value: f.priced },
    { label: 'Llegaron al formulario de reserva', value: f.checkout },
    { label: 'Empezaron a llenar sus datos', value: f.startedForm },
    { label: 'Enviaron la reserva', value: f.submitted },
    { label: 'Pagaron / confirmaron', value: f.purchased },
  ].map((step, index, all) => ({
    ...step,
    ofVisits: pct(step.value, all[0]!.value),
    ofPrevious: index === 0 ? null : pct(step.value, all[index - 1]!.value),
  }));
});

const routeTotals = computed(() => {
  const totals: Record<string, { total: number; roundTrip: number; oneWay: number }> = {};
  for (const row of stats.value?.routes ?? []) {
    const entry = (totals[row.route] ??= { total: 0, roundTrip: 0, oneWay: 0 });
    entry.total += row.count;
    if (row.tripType === 'ROUND_TRIP') entry.roundTrip += row.count;
    else entry.oneWay += row.count;
  }
  return Object.entries(totals)
    .map(([route, value]) => ({ route, ...value }))
    .sort((a, b) => b.total - a.total);
});
const routeSum = computed(() => routeTotals.value.reduce((sum, r) => sum + r.total, 0));

const maxField = computed(() => Math.max(1, ...(stats.value?.fields ?? []).map((f) => f.visitors)));
const maxClick = computed(() => Math.max(1, ...(stats.value?.clicks ?? []).map((c) => c.clicks)));
const maxMonth = computed(() => Math.max(1, ...(stats.value?.serviceMonths ?? []).map((m) => m.quotes)));
const maxStay = computed(() => Math.max(1, ...(stats.value?.stays ?? []).map((s) => s.quotes)));
const maxHour = computed(() => Math.max(1, ...(stats.value?.hours ?? []).map((h) => h.quotes)));
const maxCountry = computed(() => Math.max(1, ...(stats.value?.countries ?? []).map((c) => c.quotes)));
const maxDaily = computed(() => Math.max(1, ...(stats.value?.daily ?? []).map((d) => d.visits)));
const fieldsSorted = computed(() => [...(stats.value?.fields ?? [])].sort((a, b) => b.visitors - a.visitors));

const fieldClass =
  'h-10 w-full rounded-lg border border-fog-200 bg-white px-3 text-sm text-brand-950 outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-300/25';
const labelClass = 'mb-1 block text-xs font-semibold text-brand-900/70';
const cardClass = 'rounded-xl border border-fog-200 bg-white p-4 sm:p-5';
const h2Class = 'text-sm font-semibold text-brand-950';
const hintClass = 'mt-0.5 text-xs text-brand-900/60';
</script>

<template>
  <div class="mx-auto max-w-[90rem] space-y-4">
    <LoadErrorBanner :message="loadError" @retry="load" />

    <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <p class="max-w-2xl text-xs text-brand-900/65">
        Lo que hacen los visitantes del sitio de reservas. Es anónimo: no guarda nombres, correos ni IP, y cuenta también a quien rechaza las cookies.
        Quien activa "No rastrear" en su navegador no aparece.
      </p>
      <div class="flex flex-wrap items-end gap-2">
        <button
          v-for="days in [7, 30, 90]"
          :key="days"
          type="button"
          class="h-10 rounded-lg border border-fog-200 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          @click="setDays(days)"
        >
          {{ days }} días
        </button>
        <div>
          <label :for="ids.from" :class="labelClass">Desde</label>
          <input :id="ids.from" v-model="range.from" type="date" :class="fieldClass" @change="load" />
        </div>
        <div>
          <label :for="ids.to" :class="labelClass">Hasta</label>
          <input :id="ids.to" v-model="range.to" type="date" :class="fieldClass" @change="load" />
        </div>
        <button type="button" class="h-10 rounded-lg border border-brand-300 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50" @click="load">
          Actualizar
        </button>
      </div>
    </div>

    <p v-if="loading && !stats" class="py-10 text-center text-sm text-brand-900/60">Cargando…</p>

    <template v-if="stats">
      <p v-if="stats.totalEvents === 0" class="rounded-xl border border-dashed border-fog-200 bg-white px-4 py-8 text-center text-sm text-brand-900/70">
        Todavía no hay datos en este periodo. Se irán llenando conforme visiten y coticen en el sitio.
      </p>

      <!-- Resumen -->
      <section class="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Resumen">
        <div :class="cardClass">
          <p class="text-xs font-semibold text-brand-900/60">Visitas</p>
          <p class="mt-1 text-2xl font-bold text-brand-950">{{ stats.funnel.visits }}</p>
        </div>
        <div :class="cardClass">
          <p class="text-xs font-semibold text-brand-900/60">Pidieron precio</p>
          <p class="mt-1 text-2xl font-bold text-brand-950">{{ stats.funnel.quotes }}</p>
          <p :class="hintClass">{{ pct(stats.funnel.quotes, stats.funnel.visits) }}% de las visitas</p>
        </div>
        <div :class="cardClass">
          <p class="text-xs font-semibold text-brand-900/60">Solo vieron el precio</p>
          <p class="mt-1 text-2xl font-bold text-brand-950">{{ stats.funnel.onlyQuoted }}</p>
          <p :class="hintClass">Recibieron precio y no enviaron reserva</p>
        </div>
        <div :class="cardClass">
          <p class="text-xs font-semibold text-brand-900/60">Enviaron reserva</p>
          <p class="mt-1 text-2xl font-bold text-brand-950">{{ stats.funnel.submitted }}</p>
          <p :class="hintClass">{{ pct(stats.funnel.submitted, stats.funnel.priced) }}% de quienes vieron precio</p>
        </div>
        <div :class="cardClass">
          <p class="text-xs font-semibold text-brand-900/60">Fuera de zona / sin tarifa</p>
          <p class="mt-1 text-2xl font-bold text-brand-950">{{ stats.funnel.outOfZone }}</p>
          <p :class="hintClass">{{ stats.funnel.contactSent }} enviaron el formulario de contacto</p>
        </div>
      </section>

      <!-- Embudo -->
      <section :class="cardClass">
        <h2 :class="h2Class">Recorrido del cliente</h2>
        <p :class="hintClass">Cuántas visitas llegan a cada paso. Donde la barra cae más es donde se pierden clientes.</p>
        <ol class="mt-4 space-y-2.5">
          <li v-for="step in funnelSteps" :key="step.label">
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <span class="font-medium text-brand-950">{{ step.label }}</span>
              <span class="shrink-0 text-xs text-brand-900/70">
                <strong class="text-sm text-brand-950">{{ step.value }}</strong>
                · {{ step.ofVisits }}% de las visitas
                <template v-if="step.ofPrevious !== null"> · {{ step.ofPrevious }}% del paso anterior</template>
              </span>
            </div>
            <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-fog-100">
              <div class="h-full rounded-full bg-brand-500" :style="{ width: `${step.ofVisits}%` }" />
            </div>
          </li>
        </ol>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Llegada vs salida -->
        <section :class="cardClass">
          <h2 :class="h2Class">Llegada o salida</h2>
          <p :class="hintClass">Qué tipo de traslado cotizan.</p>
          <p v-if="routeTotals.length === 0" class="mt-4 text-sm text-brand-900/60">Sin cotizaciones en el periodo.</p>
          <ul class="mt-4 space-y-3">
            <li v-for="row in routeTotals" :key="row.route">
              <div class="flex items-baseline justify-between text-sm">
                <span class="font-medium text-brand-950">{{ ROUTE_LABEL[row.route] ?? row.route }}</span>
                <span class="text-xs text-brand-900/70"><strong class="text-sm text-brand-950">{{ row.total }}</strong> · {{ pct(row.total, routeSum) }}%</span>
              </div>
              <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-fog-100">
                <div class="h-full rounded-full bg-brand-500" :style="{ width: `${pct(row.total, routeSum)}%` }" />
              </div>
              <p :class="hintClass">{{ row.roundTrip }} viaje redondo · {{ row.oneWay }} sencillo</p>
            </li>
          </ul>
        </section>

        <!-- Campos del formulario -->
        <section :class="cardClass">
          <h2 :class="h2Class">Formulario de reserva: qué campos tocan</h2>
          <p :class="hintClass">Visitas que llegaron a cada campo. Si caen mucho en uno, ahí se atoran.</p>
          <p v-if="fieldsSorted.length === 0" class="mt-4 text-sm text-brand-900/60">Nadie ha llenado el formulario en el periodo.</p>
          <ul class="mt-4 space-y-2.5">
            <li v-for="field in fieldsSorted" :key="field.label">
              <div class="flex items-baseline justify-between text-sm">
                <span class="font-medium text-brand-950">{{ FIELD_LABEL[field.label] ?? field.label }}</span>
                <strong class="text-sm text-brand-950">{{ field.visitors }}</strong>
              </div>
              <div class="mt-1 h-2.5 overflow-hidden rounded-full bg-fog-100">
                <div class="h-full rounded-full bg-brand-400" :style="{ width: `${pct(field.visitors, maxField)}%` }" />
              </div>
            </li>
          </ul>
        </section>
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- País y ciudad -->
        <section :class="cardClass">
          <h2 :class="h2Class">De dónde cotizan</h2>
          <p :class="hintClass">Ubicación aproximada del visitante (por su conexión). Quienes usan VPN pueden aparecer en otro país.</p>
          <p v-if="stats.countries.length === 0" class="mt-4 text-sm text-brand-900/60">Sin datos en el periodo.</p>
          <ul class="mt-4 space-y-2.5">
            <li v-for="row in stats.countries" :key="row.country">
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <span class="min-w-0 truncate font-medium text-brand-950">{{ countryName(row.country) }}</span>
                <span class="shrink-0 text-xs text-brand-900/70"><strong class="text-sm text-brand-950">{{ row.quotes }}</strong> cotizaciones · {{ row.visits }} visitas</span>
              </div>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-fog-100">
                <div class="h-full rounded-full bg-brand-500" :style="{ width: `${pct(row.quotes, maxCountry)}%` }" />
              </div>
            </li>
          </ul>
          <template v-if="stats.cities.length">
            <h3 class="mt-5 text-xs font-semibold text-brand-900/70">Ciudades</h3>
            <ul class="mt-2 space-y-1.5 text-sm">
              <li v-for="row in stats.cities" :key="`${row.country}-${row.city}`" class="flex justify-between gap-3">
                <span class="min-w-0 truncate text-brand-950">{{ row.city }} <span class="text-brand-900/60">· {{ countryName(row.country) }}</span></span>
                <span class="shrink-0 text-xs text-brand-900/70"><strong class="text-sm text-brand-950">{{ row.quotes }}</strong> cot. · {{ row.visits }} vis.</span>
              </li>
            </ul>
          </template>
        </section>

        <!-- Hora del día -->
        <section :class="cardClass">
          <h2 :class="h2Class">A qué hora cotizan</h2>
          <p :class="hintClass">Hora de Cancún. Cada barra son las cotizaciones de esa hora.</p>
          <div class="mt-4 flex h-40 items-end gap-0.5" role="img" aria-label="Cotizaciones por hora del día">
            <div v-for="h in stats.hours" :key="h.hour" class="group relative flex h-full flex-1 items-end">
              <div
                class="w-full rounded-t bg-brand-400 transition group-hover:bg-brand-600"
                :style="{ height: h.quotes ? `${Math.max(4, pct(h.quotes, maxHour))}%` : '2px' }"
                :class="h.quotes ? '' : 'bg-fog-200'"
              />
              <span class="pointer-events-none absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-brand-950 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">
                {{ hourLabel(h.hour) }} · {{ h.quotes }}
              </span>
            </div>
          </div>
          <div class="mt-1 flex justify-between text-[10px] text-brand-900/60">
            <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
          </div>
        </section>
      </div>

      <!-- Fechas del servicio -->
      <section :class="cardClass">
        <h2 :class="h2Class">Fechas del servicio que cotizan</h2>
        <p :class="hintClass">La fecha de llegada o de salida que eligen (no el día en que cotizan). Sirve para ver qué fechas y meses tienen más demanda.</p>
        <p v-if="stats.serviceDates.length === 0" class="mt-4 text-sm text-brand-900/60">Sin cotizaciones con fecha en el periodo.</p>
        <div v-else class="mt-4 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 class="text-xs font-semibold text-brand-900/70">Por mes del servicio</h3>
            <ul class="mt-2 space-y-2.5">
              <li v-for="row in stats.serviceMonths" :key="row.month">
                <div class="flex items-baseline justify-between text-sm">
                  <span class="font-medium text-brand-950">{{ monthLabel(row.month) }}</span><strong>{{ row.quotes }}</strong>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-fog-100">
                  <div class="h-full rounded-full bg-brand-500" :style="{ width: `${pct(row.quotes, maxMonth)}%` }" />
                </div>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="text-xs font-semibold text-brand-900/70">Fechas más cotizadas</h3>
            <table class="mt-2 w-full text-left text-sm">
              <thead class="text-xs text-brand-900/60">
                <tr>
                  <th class="py-1 pr-2 font-semibold">Fecha</th>
                  <th class="px-2 py-1 text-right font-semibold">Cot.</th>
                  <th class="px-2 py-1 text-right font-semibold">Llegadas</th>
                  <th class="py-1 pl-2 text-right font-semibold">Salidas</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in stats.serviceDates" :key="row.date" class="border-t border-fog-100">
                  <td class="py-1.5 pr-2 font-medium text-brand-950">{{ shortDate(row.date) }}</td>
                  <td class="px-2 py-1.5 text-right font-semibold">{{ row.quotes }}</td>
                  <td class="px-2 py-1.5 text-right">{{ row.arrivals }}</td>
                  <td class="py-1.5 pl-2 text-right">{{ row.departures }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div>
            <h3 class="text-xs font-semibold text-brand-900/70">Noches entre ida y regreso (viajes redondos)</h3>
            <p v-if="stats.stays.length === 0" class="mt-2 text-sm text-brand-900/60">Sin viajes redondos.</p>
            <ul class="mt-2 space-y-2.5">
              <li v-for="row in stats.stays" :key="row.nights">
                <div class="flex items-baseline justify-between text-sm">
                  <span class="font-medium text-brand-950">{{ row.nights }} {{ row.nights === 1 ? 'noche' : 'noches' }}</span><strong>{{ row.quotes }}</strong>
                </div>
                <div class="mt-1 h-2 overflow-hidden rounded-full bg-fog-100">
                  <div class="h-full rounded-full bg-brand-400" :style="{ width: `${pct(row.quotes, maxStay)}%` }" />
                </div>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <!-- Últimas cotizaciones -->
      <section :class="cardClass">
        <h2 :class="h2Class">Últimas cotizaciones</h2>
        <p :class="hintClass">Hora de Cancún. "Zona" es la zona horaria del navegador del visitante.</p>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[56rem] text-left text-sm">
            <thead class="text-xs text-brand-900/60">
              <tr>
                <th class="py-2 pr-3 font-semibold">Cuándo</th>
                <th class="px-3 py-2 font-semibold">Desde</th>
                <th class="px-3 py-2 font-semibold">Tipo</th>
                <th class="px-3 py-2 font-semibold">Hotel</th>
                <th class="px-3 py-2 font-semibold">Fecha del servicio</th>
                <th class="px-3 py-2 text-right font-semibold">Pasajeros</th>
                <th class="py-2 pl-3 text-right font-semibold">Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="stats.recent.length === 0">
                <td colspan="7" class="py-6 text-center text-brand-900/60">Sin cotizaciones en el periodo.</td>
              </tr>
              <tr v-for="(row, i) in stats.recent" :key="i" class="border-t border-fog-100">
                <td class="py-2 pr-3 font-medium whitespace-nowrap text-brand-950">{{ cancunTime(row.at) }}</td>
                <td class="px-3 py-2">
                  {{ row.city ? `${row.city}, ` : '' }}{{ countryName(row.country) }}
                  <span v-if="row.tz" class="block text-xs text-brand-900/55">Zona: {{ row.tz }}</span>
                </td>
                <td class="px-3 py-2">{{ row.route === 'AIRPORT_HOTEL' ? 'Llegada' : row.route === 'HOTEL_AIRPORT' ? 'Salida' : 'Entre hoteles' }}<span class="block text-xs text-brand-900/55">{{ row.tripType === 'ROUND_TRIP' ? 'Redondo' : 'Sencillo' }}</span></td>
                <td class="px-3 py-2">{{ row.hotel ?? '—' }}</td>
                <td class="px-3 py-2 whitespace-nowrap">
                  {{ shortDate(row.serviceDate) }}
                  <span v-if="row.returnDate" class="block text-xs text-brand-900/55">Regreso: {{ shortDate(row.returnDate) }}</span>
                </td>
                <td class="px-3 py-2 text-right">{{ row.passengers ?? '—' }}</td>
                <td class="py-2 pl-3 text-right" :class="row.serviceable ? '' : 'text-accent-600'">{{ row.serviceable ? `Desde ${usd(row.amount)}` : 'Sin precio' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Hoteles -->
      <section :class="cardClass">
        <h2 :class="h2Class">Hoteles más buscados</h2>
        <p :class="hintClass">Por número de cotizaciones. "Sin precio" son búsquedas que terminaron en el formulario de contacto.</p>
        <div class="mt-3 overflow-x-auto">
          <table class="w-full min-w-[40rem] text-left text-sm">
            <thead class="text-xs text-brand-900/60">
              <tr>
                <th class="py-2 pr-3 font-semibold">Hotel</th>
                <th class="px-3 py-2 text-right font-semibold">Búsquedas</th>
                <th class="px-3 py-2 text-right font-semibold">Llegadas</th>
                <th class="px-3 py-2 text-right font-semibold">Salidas</th>
                <th class="px-3 py-2 text-right font-semibold">Sin precio</th>
                <th class="py-2 pl-3 text-right font-semibold">Precio desde (prom.)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="stats.hotels.length === 0">
                <td colspan="6" class="py-6 text-center text-brand-900/60">Sin búsquedas en el periodo.</td>
              </tr>
              <tr v-for="hotel in stats.hotels" :key="hotel.hotel" class="border-t border-fog-100">
                <td class="py-2 pr-3 font-medium text-brand-950">{{ hotel.hotel }}</td>
                <td class="px-3 py-2 text-right font-semibold">{{ hotel.searches }}</td>
                <td class="px-3 py-2 text-right">{{ hotel.arrivals }}</td>
                <td class="px-3 py-2 text-right">{{ hotel.departures }}</td>
                <td class="px-3 py-2 text-right" :class="hotel.searches - hotel.priced > 0 ? 'text-accent-600' : ''">{{ hotel.searches - hotel.priced }}</td>
                <td class="py-2 pl-3 text-right">{{ usd(hotel.avgFrom) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="grid gap-4 lg:grid-cols-2">
        <!-- Clics -->
        <section :class="cardClass">
          <h2 :class="h2Class">Clics clave</h2>
          <p :class="hintClass">Enlaces (destinos, servicios, menú), WhatsApp y teléfono.</p>
          <p v-if="stats.clicks.length === 0" class="mt-4 text-sm text-brand-900/60">Sin clics en el periodo.</p>
          <ul class="mt-4 space-y-2.5">
            <li v-for="click in stats.clicks" :key="click.label">
              <div class="flex items-baseline justify-between gap-3 text-sm">
                <span class="min-w-0 truncate font-medium text-brand-950">{{ clickLabel(click.label) }}</span>
                <span class="shrink-0 text-xs text-brand-900/70"><strong class="text-sm text-brand-950">{{ click.clicks }}</strong> clics · {{ click.visitors }} visitas</span>
              </div>
              <div class="mt-1 h-2 overflow-hidden rounded-full bg-fog-100">
                <div class="h-full rounded-full bg-brand-400" :style="{ width: `${pct(click.clicks, maxClick)}%` }" />
              </div>
            </li>
          </ul>
        </section>

        <div class="space-y-4">
          <section :class="cardClass">
            <h2 :class="h2Class">Vehículo elegido</h2>
            <p v-if="stats.vehicles.length === 0" class="mt-3 text-sm text-brand-900/60">Sin datos.</p>
            <ul class="mt-3 space-y-1.5 text-sm">
              <li v-for="vehicle in stats.vehicles" :key="vehicle.label" class="flex justify-between">
                <span class="text-brand-950">{{ vehicle.label }}</span><strong>{{ vehicle.count }}</strong>
              </li>
            </ul>
          </section>
          <div class="grid gap-4 sm:grid-cols-2">
            <section :class="cardClass">
              <h2 :class="h2Class">De dónde llegan</h2>
              <ul class="mt-3 space-y-1.5 text-sm">
                <li v-for="source in stats.sources" :key="source.label" class="flex justify-between gap-2">
                  <span class="min-w-0 truncate text-brand-950">{{ source.label }}</span><strong>{{ source.visitors }}</strong>
                </li>
              </ul>
            </section>
            <section :class="cardClass">
              <h2 :class="h2Class">Dispositivo</h2>
              <ul class="mt-3 space-y-1.5 text-sm">
                <li v-for="device in stats.devices" :key="device.label" class="flex justify-between">
                  <span class="text-brand-950">{{ DEVICE_LABEL[device.label] ?? device.label }}</span><strong>{{ device.visitors }}</strong>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      <!-- Por día -->
      <section :class="cardClass">
        <h2 :class="h2Class">Por día</h2>
        <div class="mt-3 max-h-80 overflow-y-auto">
          <table class="w-full text-left text-sm">
            <thead class="sticky top-0 bg-white text-xs text-brand-900/60">
              <tr>
                <th class="py-2 pr-3 font-semibold">Día</th>
                <th class="px-3 py-2 font-semibold">Visitas</th>
                <th class="px-3 py-2 text-right font-semibold">Cotizaron</th>
                <th class="py-2 pl-3 text-right font-semibold">Enviaron reserva</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="day in [...stats.daily].reverse()" :key="day.day" class="border-t border-fog-100">
                <td class="py-2 pr-3 font-medium text-brand-950">{{ day.day }}</td>
                <td class="px-3 py-2">
                  <div class="flex items-center gap-2">
                    <div class="h-2 w-full max-w-40 overflow-hidden rounded-full bg-fog-100">
                      <div class="h-full rounded-full bg-brand-400" :style="{ width: `${pct(day.visits, maxDaily)}%` }" />
                    </div>
                    <span>{{ day.visits }}</span>
                  </div>
                </td>
                <td class="px-3 py-2 text-right">{{ day.quotes }}</td>
                <td class="py-2 pl-3 text-right">{{ day.bookings }}</td>
              </tr>
              <tr v-if="stats.daily.length === 0">
                <td colspan="4" class="py-6 text-center text-brand-900/60">Sin datos en el periodo.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>
