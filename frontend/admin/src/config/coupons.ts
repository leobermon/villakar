import type { BadgeTone } from '@/components/ui/badge';
import type { CouponState, ManagedCoupon } from '@/types/coupon';

export const COUPON_STATE_LABEL: Record<CouponState, string> = {
  active: 'Vigente',
  scheduled: 'Programado',
  expired: 'Vencido',
  exhausted: 'Agotado',
  inactive: 'Desactivado',
};

export const COUPON_STATE_TONE: Record<CouponState, BadgeTone> = {
  active: 'success',
  scheduled: 'info',
  expired: 'neutral',
  exhausted: 'warning',
  inactive: 'neutral',
};

/** Hora actual de Cancún como 'YYYY-MM-DDTHH:MM', comparable con las fechas del cupón. */
function nowInCancun(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Cancun',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function couponState(coupon: ManagedCoupon): CouponState {
  if (!coupon.isActive) return 'inactive';
  const now = nowInCancun();
  if (now < coupon.validFrom) return 'scheduled';
  if (now > coupon.validTo) return 'expired';
  if (coupon.maxUses !== null && coupon.uses >= coupon.maxUses) return 'exhausted';
  return 'active';
}
