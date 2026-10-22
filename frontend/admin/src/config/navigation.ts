/** Menú lateral. `ready: false` = módulo aún no construido (se muestra como "Pronto"). */
export interface NavItem {
  name: string;
  label: string;
  icon: 'orders' | 'payments' | 'emails' | 'contacts' | 'rates' | 'vehicles' | 'zones' | 'users' | 'settings' | 'audit';
  ready: boolean;
  /** Solo lo ven administradores y superadministradores. */
  adminOnly?: boolean;
  /** Solo lo ven los superadministradores. */
  superOnly?: boolean;
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
    items: [
      { name: 'users', label: 'Usuarios', icon: 'users', ready: true, adminOnly: true },
      { name: 'settings', label: 'Configuración', icon: 'settings', ready: true },
      { name: 'audit', label: 'Historial', icon: 'audit', ready: true, superOnly: true },
    ],
  },
];
