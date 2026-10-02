import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
  ReservationStatus,
  WebhookProvider,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { PayableReservation } from '../reservations/reservations.service';

export interface ProviderCharge {
  /** Monto cobrado según el proveedor, en USD. */
  amount: Prisma.Decimal;
  currency: string;
  /** Datos mínimos del proveedor para conciliar (ids, estado). Sin datos de tarjeta. */
  payload: Prisma.InputJsonObject;
}

/**
 * Registro de pagos común a Stripe y PayPal. Cada intento de cobro es una fila
 * en `payments` identificada por (provider, providerPaymentId), y confirmar un
 * cobro es idempotente: el webhook y el regreso del cliente pueden llegar a la
 * vez o repetirse sin duplicar efectos.
 */
@Injectable()
export class PaymentLedgerService {
  private readonly logger = new Logger(PaymentLedgerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: ReservationEmailsService,
  ) {}

  async recordAttempt(
    reservation: PayableReservation,
    provider: PaymentProvider,
    providerPaymentId: string,
  ): Promise<void> {
    await this.prisma.payment.create({
      data: {
        reservationId: reservation.id,
        provider,
        providerPaymentId,
        type: PaymentType.CHARGE,
        amount: reservation.total,
        currency: 'USD',
      },
    });
  }

  /**
   * Pago en efectivo al chofer después del servicio: la reserva queda
   * CONFIRMED sin pagar, y el cobro queda PENDING hasta que el equipo lo
   * registre como cobrado.
   */
  async recordCashOnService(reservation: PayableReservation): Promise<void> {
    const confirmedNow = await this.prisma.$transaction(async (tx) => {
      // Reclamo atómico: solo una petición puede pasar la reserva de PENDING a CONFIRMED.
      const confirmed = await tx.reservation.updateMany({
        where: { id: reservation.id, status: ReservationStatus.PENDING, paymentStatus: PaymentStatus.UNPAID },
        data: { status: ReservationStatus.CONFIRMED, expiresAt: null },
      });
      if (confirmed.count === 0) return false;

      await tx.payment.create({
        data: {
          reservationId: reservation.id,
          provider: PaymentProvider.CASH,
          type: PaymentType.CHARGE,
          amount: reservation.total,
          currency: 'USD',
        },
      });
      await tx.reservationStatusHistory.create({
        data: {
          reservationId: reservation.id,
          fromStatus: ReservationStatus.PENDING,
          toStatus: ReservationStatus.CONFIRMED,
          comment: 'Customer will pay in cash after the service',
        },
      });
      return true;
    });

    // Fuera de la transacción: el correo solo sale si la confirmación ya quedó guardada.
    if (confirmedNow) await this.emails.sendConfirmation(reservation.id);
  }

  /** Marca el cobro como exitoso, confirma la reserva y envía el correo. Devuelve el código de la reserva. */
  async markSucceeded(provider: PaymentProvider, providerPaymentId: string, charge: ProviderCharge): Promise<string> {
    const { code, paidNow } = await this.applySucceededCharge(provider, providerPaymentId, charge);
    if (paidNow !== null) await this.emails.sendConfirmation(paidNow);
    return code;
  }

  /** `paidNow` es el id de la reserva si este cobro fue el que la dejó pagada. */
  private applySucceededCharge(
    provider: PaymentProvider,
    providerPaymentId: string,
    charge: ProviderCharge,
  ): Promise<{ code: string; paidNow: bigint | null }> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { provider, providerPaymentId, type: PaymentType.CHARGE },
        include: { reservation: true },
      });
      if (!payment) throw new NotFoundException('Payment not found');
      const { reservation } = payment;

      // Reclamo atómico: si otra petición ya lo marcó, no se repiten efectos.
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: PaymentRecordStatus.SUCCEEDED } },
        data: {
          status: PaymentRecordStatus.SUCCEEDED,
          paidAt: new Date(),
          failureReason: null,
          providerPayload: charge.payload,
        },
      });
      if (claimed.count === 0) return { code: reservation.code, paidNow: null };

      if (!charge.amount.equals(payment.amount) || charge.currency.toUpperCase() !== payment.currency) {
        this.logger.error(
          `Reservation ${reservation.code}: ${provider} charged ${charge.amount.toString()} ${charge.currency}, expected ${payment.amount.toString()} ${payment.currency}`,
        );
      }

      if (reservation.paymentStatus === PaymentStatus.PAID) {
        // El cliente pagó dos veces (p. ej. con tarjeta y con PayPal): hay que reembolsar uno.
        this.logger.warn(`Reservation ${reservation.code} received a duplicate ${provider} payment`);
        await tx.reservation.update({
          where: { id: reservation.id },
          data: {
            internalNotes: appendNote(
              reservation.internalNotes,
              `Duplicate ${provider} payment ${providerPaymentId}: refund required.`,
            ),
          },
        });
        return { code: reservation.code, paidNow: null };
      }

      const nextStatus =
        reservation.status === ReservationStatus.PENDING ? ReservationStatus.CONFIRMED : reservation.status;
      await tx.reservation.update({
        where: { id: reservation.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: nextStatus,
          expiresAt: null,
          ...(nextStatus === reservation.status
            ? {
                internalNotes: appendNote(
                  reservation.internalNotes,
                  `Paid with ${provider} while status was ${reservation.status}: review.`,
                ),
              }
            : {}),
        },
      });
      if (nextStatus !== reservation.status) {
        await tx.reservationStatusHistory.create({
          data: {
            reservationId: reservation.id,
            fromStatus: reservation.status,
            toStatus: nextStatus,
            comment: `Paid online with ${provider}`,
          },
        });
      }
      return { code: reservation.code, paidNow: reservation.id };
    });
  }

  /** Cierra un intento que no se cobró (expirado, cancelado o rechazado). */
  async markClosed(
    provider: PaymentProvider,
    providerPaymentId: string,
    status: typeof PaymentRecordStatus.FAILED | typeof PaymentRecordStatus.CANCELLED,
    reason: string,
  ): Promise<void> {
    await this.prisma.payment.updateMany({
      where: { provider, providerPaymentId, type: PaymentType.CHARGE, status: PaymentRecordStatus.PENDING },
      data: { status, failureReason: reason.slice(0, 255) },
    });
  }

  /**
   * Guarda un evento de webhook y devuelve su id, o null si ya se había
   * procesado (los proveedores reintentan), para no procesarlo dos veces.
   */
  async recordWebhookEvent(
    provider: WebhookProvider,
    eventId: string,
    eventType: string,
    payload: Prisma.InputJsonObject,
  ): Promise<bigint | null> {
    try {
      const event = await this.prisma.paymentWebhookEvent.create({
        data: { provider, eventId, eventType, payload },
        select: { id: true },
      });
      return event.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.paymentWebhookEvent.findUnique({
          where: { provider_eventId: { provider, eventId } },
          select: { id: true, processedAt: true },
        });
        // Si el intento anterior falló antes de terminar, se vuelve a procesar.
        return existing && !existing.processedAt ? existing.id : null;
      }
      throw error;
    }
  }

  async markWebhookProcessed(id: bigint): Promise<void> {
    await this.prisma.paymentWebhookEvent.update({ where: { id }, data: { processedAt: new Date() } });
  }
}

function appendNote(current: string | null, note: string): string {
  const stamped = `[${new Date().toISOString()}] ${note}`;
  return current ? `${current}\n${stamped}` : stamped;
}
