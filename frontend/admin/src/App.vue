<script setup lang="ts">
import { useRoute } from 'vue-router';
import AdminLayout from '@/layouts/AdminLayout.vue';

const route = useRoute();
</script>

<template>
  <!-- El login va sin menú lateral ni header. -->
  <RouterView v-if="route.meta.public" />
  <AdminLayout v-else>
    <RouterView />
  </AdminLayout>
</template>
