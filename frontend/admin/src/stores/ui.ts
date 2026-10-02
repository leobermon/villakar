import { defineStore } from 'pinia';
import { ref } from 'vue';

/** Estado de la interfaz compartido por el layout (menú lateral en móvil). */
export const useUiStore = defineStore('ui', () => {
  const sidebarOpen = ref(false);

  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value;
  }

  function closeSidebar() {
    sidebarOpen.value = false;
  }

  return { sidebarOpen, toggleSidebar, closeSidebar };
});
