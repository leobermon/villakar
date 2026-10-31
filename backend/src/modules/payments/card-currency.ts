import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { PaymentSettings } from '../settings/settings.types';

/** Moneda en la que el cliente elige pagar con tarjeta (Stripe). El precio del sitio siempre es en USD. */
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
}

/** Pesos enteros (redondeados hacia arriba) que equivalen a un monto en USD con el tipo de cambio dado. */
export function usdToPesos(usd: Prisma.Decimal, rate: number): number {
  return usd.mul(rate).toDecimalPlaces(2).ceil().toNumber();
}

/**
 * Arma el cobro con tarjeta: en USD tal cual, o en MXN con el tipo de cambio que se capturó en el panel
 * (Configuración → Pagos). El registro del pago en el sistema siempre queda en USD (ver `usdChargeFrom`).
 */
export function buildCardCharge(usd: Prisma.Decimal, currency: CardCurrency, payments: PaymentSettings): CardCharge {
  if (currency === 'usd') {
    return { currency, unitAmount: usd.mul(100).toDecimalPlaces(0).toNumber(), metadata: {}, note: null };
  }
  const rate = payments.usdToMxnRate;
  if (!rate) throw new BadRequestException('Payment in Mexican pesos is not available right now. Please pay in US dollars.');
  const pesos = usdToPesos(usd, rate);
  return {
    currency,
    unitAmount: pesos * 100,
    metadata: { usdTotal: usd.toFixed(2), mxnRate: String(rate) },
    note: `$${usd.toFixed(2)} USD converted at ${rate} MXN per USD`,
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
