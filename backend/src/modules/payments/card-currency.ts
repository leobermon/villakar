import { Prisma } from '@prisma/client';
import type Stripe from 'stripe';
import type { PaymentSettings } from '../settings/settings.types';

/** Moneda del cobro con tarjeta (Stripe). El precio del sitio siempre es en USD. */
export type CardCurrency = 'usd' | 'mxn';

export interface CardCharge {
  /** Moneda del cobro en Stripe. */
  currency: CardCurrency;
  /** Monto del cobro en la unidad menor (centavos). */
  unitAmount: number;
  /** Datos que se guardan en la sesión de Stripe para registrar el pago en USD al confirmarse. */
  metadata: Record<string, string>;
  /** Texto para la página de Stripe cuando se cobra en pesos (muestra el monto original y el tipo de cambio). */
  note: string | null;
  /**
   * Opciones extra de la sesión de Checkout. En pesos se apaga Adaptive Pricing: ya es la moneda de la cuenta,
   * y así Stripe no la reconvierte a la moneda de un cliente de otro país.
   */
  sessionParams: Pick<Stripe.Checkout.SessionCreateParams, 'adaptive_pricing'>;
}

/** Pesos enteros (redondeados hacia arriba) que equivalen a un monto en USD con el tipo de cambio dado. */
export function usdToPesos(usd: Prisma.Decimal, rate: number): number {
  return usd.mul(rate).toDecimalPlaces(2).ceil().toNumber();
}

/**
 * Arma el cobro con tarjeta: en MXN con el tipo de cambio que se capturó en el panel (Configuración → Pagos).
 * Si no hay tipo de cambio, se cobra en USD tal cual. El registro del pago en el sistema siempre queda en USD
 * (ver `chargeFromSession`).
 */
export function buildCardCharge(usd: Prisma.Decimal, payments: PaymentSettings): CardCharge {
  const rate = payments.usdToMxnRate;
  if (!rate) {
    return { currency: 'usd', unitAmount: usd.mul(100).toDecimalPlaces(0).toNumber(), metadata: {}, note: null, sessionParams: {} };
  }
  const currency: CardCurrency = 'mxn';
  const pesos = usdToPesos(usd, rate);
  return {
    currency,
    unitAmount: pesos * 100,
    metadata: { usdTotal: usd.toFixed(2), mxnRate: String(rate) },
    note: `${usd.toFixed(2)} USD converted at ${rate} MXN per USD`,
    sessionParams: { adaptive_pricing: { enabled: false } },
  };
}

/** Datos mínimos de una sesión de Checkout para registrar el cobro. */
interface SessionLike {
  currency?: string | null;
  amount_total?: number | null;
  metadata?: Record<string, string> | null;
}

/**
 * Monto y moneda con los que se registra un cobro de Stripe. Si se cobró en pesos, el pago se registra
 * en USD (el total de la reserva) y lo realmente cobrado en pesos queda en el detalle del pago.
 */
export function chargeFromSession(session: SessionLike): {
  amount: Prisma.Decimal;
  currency: string;
  extra: Prisma.InputJsonObject;
} {
  const total = new Prisma.Decimal(session.amount_total ?? 0).div(100);
  const usdTotal = session.metadata?.usdTotal;
  if (session.currency === 'mxn' && usdTotal) {
    return {
      amount: new Prisma.Decimal(usdTotal),
      currency: 'usd',
      extra: { chargedCurrency: 'MXN', chargedAmount: total.toNumber(), usdToMxnRate: Number(session.metadata?.mxnRate ?? 0) },
    };
  }
  return { amount: total, currency: session.currency ?? 'usd', extra: {} };
}
