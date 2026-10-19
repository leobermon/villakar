import type { UserRole } from '@/stores/auth';

/** Usuario del panel, como lo devuelve /api/admin/users (nunca trae la contraseña). */
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  /** Instante UTC ISO del último inicio de sesión; null si nunca ha entrado. */
  lastLoginAt: string | null;
  createdAt: string;
}

export interface NewUser {
  name: string;
  email: string;
  role: UserRole;
  password: string;
}

export interface UserUpdate {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
  /** Si viene, restablece la contraseña. */
  password?: string;
}
