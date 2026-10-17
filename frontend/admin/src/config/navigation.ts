/** Menú lateral. `ready: false` = módulo aún no construido (se muestra como "Pronto"). */
export interface NavItem {
  name: string;
  label: string;
  icon: 'orders' | 'payments' | 'emails' | 'contacts' | 'rates' | 'vehicles' | 'zones' | 'settings';
  ready: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAVIGATION: NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { name: 'orders', label: 'Órdenes', icon: 'orders', ready: true },
      { name: 'payments', label: 'Pagos', icon: 'payments', ready: true },
    ],
  },
  {
    label: 'Comunicación',
    items: [
      { name: 'emails', label: 'Correos', icon: 'emails', ready: true },
      { name: 'contacts', label: 'Mensajes', icon: 'contacts', ready: true },
    ],
  },
  {
    label: 'Catálogo',
    items: [
      { name: 'rates', label: 'Tarifas', icon: 'rates', ready: true },
      { name: 'vehicles', label: 'Vehículos', icon: 'vehicles', ready: true },
      { name: 'zones', label: 'Zonas', icon: 'zones', ready: true },
    ],
  },
  {
    label: 'Sistema',
    items: [{ name: 'settings', label: 'Configuración', icon: 'settings', ready: true }],
  },
];
