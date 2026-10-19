import type { BadgeTone } from '@/components/ui/badge';
import { ROLE_LABEL, type UserRole } from '@/stores/auth';

export { ROLE_LABEL };

/** Roles en el orden en que se ofrecen al dar de alta o editar un usuario. */
export const ROLE_ORDER: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'OPERATOR'];

export const ROLE_TONE: Record<UserRole, BadgeTone> = {
  SUPER_ADMIN: 'brand',
  ADMIN: 'info',
  OPERATOR: 'neutral',
};

/** Descripción corta del rol. Los permisos reales de cada rol se definirán más adelante. */
export const ROLE_HINT: Record<UserRole, string> = {
  SUPER_ADMIN: 'Acceso total al panel.',
  ADMIN: 'Administra el catálogo, los pagos y los usuarios.',
  OPERATOR: 'Opera las órdenes del día.',
};

/** Misma longitud mínima que valida el backend. */
export const MIN_PASSWORD = 12;
