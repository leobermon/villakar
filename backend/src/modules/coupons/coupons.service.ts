import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { Coupon, PaymentStatus, Prisma, ReservationStatus, TripType } from '@prisma/client';
import { nowInCancun } from '../../common/utils/time';
import { PrismaService } from '../../prisma/prisma.service';

type Db = PrismaService | Prisma.TransactionClient;

export interface AppliedCoupon {
  coupon: Coupon;
  /** Descuento en USD ya limitado al precio (el total nunca baja de 0). */
  discount: Prisma.Decimal;
}

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Usos "caídos": la reserva se canceló o venció sin pagarse. Liberan el cupón para que el cliente
 * pueda reintentar con el mismo correo y para que no ocupen uno de los usos del límite.
 */
function staleRedemption(): Prisma.CouponRedemptionWhereInput {
  return {
    reservation: {
      OR: [
        { status: ReservationStatus.CANCELLED },
        { status: ReservationStatus.PENDING, paymentStatus: PaymentStatus.UNPAID, expiresAt: { lt: new Date() } },
      ],
    },
  };
}

/** Reglas de los cupones de descuento (monto fijo por reserva, un uso por correo). */
@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vista previa para el checkout: valida el código y dice cuánto descuenta. No aparta ningún uso. */
  async preview(code: string, tripType: TripType, email?: string): Promise<{ code: string; discount: number }> {
    const coupon = await this.assertUsable(this.prisma, code, email ? normalizeEmail(email) : null);
    return { code: coupon.code, discount: amountFor(coupon, tripType).toNumber() };
  }

  /**
   * Dentro de la transacción de la reserva: bloquea la fila del cupón (así dos reservas a la vez no
   * se pasan del límite de usos), libera los usos caídos, valida y calcula el descuento.
   */
  async lockAndApply(
    tx: Prisma.TransactionClient,
    code: string,
    tripType: TripType,
    email: string,
    price: Prisma.Decimal,
  ): Promise<AppliedCoupon> {
    const normalized = normalizeCouponCode(code);
    await tx.$queryRaw`SELECT id FROM coupons WHERE code = ${normalized} FOR UPDATE`;
    const coupon = await this.assertUsable(tx, normalized, normalizeEmail(email));
    // Libera los usos caídos del cupón: sin esto el índice (cupón, correo) bloquearía un reintento.
    await tx.couponRedemption.deleteMany({ where: { couponId: coupon.id, ...staleRedemption() } });
    return { coupon, discount: Prisma.Decimal.min(amountFor(coupon, tripType), price) };
  }

  /** Cupón válido hoy, con usos disponibles y (si se conoce) no usado antes con ese correo. */
  private async assertUsable(db: Db, code: string, email: string | null): Promise<Coupon> {
    const normalized = normalizeCouponCode(code);
    const coupon = normalized ? await db.coupon.findUnique({ where: { code: normalized } }) : null;
    if (!coupon || !coupon.isActive) fail('This discount code is not valid.');

    const now = nowInCancun();
    if (now < coupon.validFrom) fail('This discount code is not active yet.');
    if (now > coupon.validTo) fail('This discount code has expired.');

    const live: Prisma.CouponRedemptionWhereInput = { couponId: coupon.id, NOT: staleRedemption() };
    if (coupon.maxUses !== null && (await db.couponRedemption.count({ where: live })) >= coupon.maxUses) {
      fail('This discount code has reached its usage limit.');
    }
    if (email && (await db.couponRedemption.count({ where: { ...live, email } })) > 0) {
      fail('This discount code has already been used with this email.');
    }
    return coupon;
  }
}

function amountFor(coupon: Coupon, tripType: TripType): Prisma.Decimal {
  return tripType === TripType.ROUND_TRIP ? coupon.discountRoundTrip : coupon.discountOneWay;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function fail(message: string): never {
  throw new UnprocessableEntityException(message);
}
