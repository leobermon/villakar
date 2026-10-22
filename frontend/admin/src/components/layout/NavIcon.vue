<script setup lang="ts">
import type { NavItem } from '@/config/navigation';

defineProps<{ name: NavItem['icon'] }>();
</script>

<template>
  <svg
    viewBox="0 0 24 24"
    class="size-[18px] shrink-0"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- Órdenes: portapapeles con lista -->
    <template v-if="name === 'orders'">
      <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1Z" />
      <path d="M16 5h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2M9 11h6M9 15h4" />
    </template>
    <!-- Pagos: tarjeta -->
    <template v-else-if="name === 'payments'">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </template>
    <!-- Correos: sobre -->
    <template v-else-if="name === 'emails'">
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.5 7 8.5 6.5L20.5 7" />
    </template>
    <!-- Mensajes: globo de chat -->
    <template v-else-if="name === 'contacts'">
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-8l-4.5 3.5V17H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M8 10h8M8 13h5" />
    </template>
    <!-- Tarifas: etiqueta de precio -->
    <template v-else-if="name === 'rates'">
      <path d="M20 13.5 13.5 20a1.5 1.5 0 0 1-2.1 0L4 12.6V4h8.6l7.4 7.4a1.5 1.5 0 0 1 0 2.1Z" />
      <circle cx="8.5" cy="8.5" r="1.5" />
    </template>
    <!-- Vehículos: camioneta -->
    <template v-else-if="name === 'vehicles'">
      <path d="M3 16V9a2 2 0 0 1 2-2h9l4 4h1a2 2 0 0 1 2 2v3h-2M3 16h2M9 16h6" />
      <circle cx="7" cy="16.5" r="1.8" />
      <circle cx="17" cy="16.5" r="1.8" />
    </template>
    <!-- Zonas: mapa con marcador -->
    <template v-else-if="name === 'zones'">
      <path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" />
      <path d="M9 4v14M15 6v14" />
    </template>
    <!-- Usuarios: dos personas -->
    <template v-else-if="name === 'users'">
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M3 19.5c.4-3.3 2.8-5 6-5s5.6 1.7 6 5M16 5.6a3 3 0 0 1 0 5.8M17.5 14.8c2 .5 3.3 2 3.5 4.7" />
    </template>
    <!-- Historial: reloj con flecha -->
    <template v-else-if="name === 'audit'">
      <path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 4v4.5H8M12 7.5V12l3 2" />
    </template>
    <!-- Configuración: engrane -->
    <template v-else>
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
      />
    </template>
  </svg>
</template>
