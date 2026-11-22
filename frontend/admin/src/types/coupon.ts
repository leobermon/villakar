/** Cupón de descuento, como lo devuelve /api/admin/coupons. Las fechas son hora local de Cancún ('YYYY-MM-DDTHH:MM'). */
export interface ManagedCoupon {
  id: number;
  code: string;
  description: string | null;
  /** Descuento fijo en USD para una reserva one way / round trip. */
  discountOneWay: number;
  discountRoundTrip: number;
  validFrom: string;
  validTo: string;
  /** Usos totales permitidos; null = sin límite. */
  maxUses: number | null;
  isActive: boolean;
  /** Usos vigentes (sin contar reservas canceladas o vencidas sin pagar). */
  uses: number;
  createdAt: string;
}

export interface NewCoupon {
  code: string;
  description?: string;
  discountOneWay: number;
  discountRoundTrip: number;
  validFrom: string;
  validTo: string;
  maxUses: number | null;
  isActive: boolean;
}

export type CouponUpdate = Partial<Omit<NewCoupon, 'code'>>;

export type CouponState = 'inactive' | 'scheduled' | 'active' | 'expired' | 'exhausted';
