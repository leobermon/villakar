import { randomBytes } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentLinkStatus,
  PaymentProvider,
  PaymentRecordStatus,
  PaymentStatus,
  PaymentType,
  Prisma,
  ReservationStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AdminUser } from '../auth/auth.service';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { AdminOrder, linkInclude, paymentInclude, toPayment, toPaymentLink } from './admin-orders.mappers';
import { AdminOrdersService } from './admin-orders.service';
import { CreatePaymentLinkDto, ManualPaymentDto, RejectPaymentDto, VerifyPaymentDto } from './dto';

type Tx = Prisma.TransactionClient;

/** Órdenes que ya no admiten cobros nuevos. */
const CLOSED_STATUSES: ReservationStatus[] = [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW];

/** Resultado de un movimiento: los pagos de la orden y la orden con su estado de pago recalculado. */
export interface PaymentChange {
  order: AdminOrder;
  payments: ReturnType<typeof toPayment>[];
}

/**
 * Pagos manuales y links de pago del panel. Cada movimiento recalcula el estado
 * de pago de la reserva a partir de la tabla payments, para que Órdenes y Pagos
 * siempre cuadren.
 */
@Injectable()
export class AdminPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: AdminOrdersService,
    private readonly emails: ReservationEmailsService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const [payments, links] = await Promise.all([
      this.prisma.payment.findMany({ include: paymentInclude, orderBy: { createdAt: 'desc' } }),
      this.prisma.paymentLink.findMany({ include: linkInclude, orderBy: { createdAt: 'desc' } }),
    ]);
    const site = this.siteUrl();
    return { payments: payments.map(toPayment), links: links.map((link) => toPaymentLink(link, site)) };
  }

  /** Confirma un cobro pendiente: efectivo entregado por el chofer o transferencia vista en el banco. */
  async verify(id: number, dto: VerifyPaymentDto, actor: AdminUser): Promise<PaymentChange> {
    const userId = actor.id;
    const { reservationId, confirmedNow } = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: BigInt(id) } });
      if (!payment) throw new NotFoundException('El pago no existe.');
      if (payment.provider !== PaymentProvider.CASH && payment.provider !== PaymentProvider.TRANSFER) {
        throw new BadRequestException('Los pagos con tarjeta y PayPal se confirman solos con el proveedor.');
      }
      // Reclamo atómico: si dos personas verifican a la vez, solo una pasa.
      const claimed = await tx.payment.updateMany({
        where: { id: payment.id, status: PaymentRecordStatus.PENDING },
        data: {
          status: PaymentRecordStatus.SUCCEEDED,
          paidAt: new Date(),
          receivedBy: clean(dto.receivedBy),
          reference: clean(dto.reference) ?? payment.reference,
          note: clean(dto.note) ?? payment.note,
          recordedBy: userId,
        },
      });
      if (claimed.count === 0) throw new ConflictException('Este pago ya no está pendiente.');
      const confirmed = await this.syncReservation(tx, payment.reservationId, userId);
      return { reservationId: payment.reservationId, confirmedNow: confirmed };
    });
    await this.logPayment(actor, 'PAYMENT_VERIFIED', id, reservationId, 'Confirmó el cobro', { receivedBy: clean(dto.receivedBy), reference: clean(dto.reference) });
    return this.afterChange(reservationId, confirmedNow);
  }

  /** Marca un cobro pendiente como no recibido (p. ej. la transferencia nunca llegó). */
  async reject(id: number, dto: RejectPaymentDto, actor: AdminUser): Promise<PaymentChange> {
    const userId = actor.id;
    const payment = await this.prisma.payment.findUnique({ where: { id: BigInt(id) } });
    if (!payment) throw new NotFoundException('El pago no existe.');
    const reason = dto.reason.trim();
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentRecordStatus.PENDING },
      data: { status: PaymentRecordStatus.FAILED, failureReason: reason, note: reason, recordedBy: userId },
    });
    if (claimed.count === 0) throw new ConflictException('Este pago ya no está pendiente.');
    await this.logPayment(actor, 'PAYMENT_REJECTED', id, payment.reservationId, 'Marcó como no recibido el cobro', { reason });
    return this.afterChange(payment.reservationId, false);
  }

  /** Alta de un cobro ya recibido (efectivo o transferencia). `payment` es el cobro creado. */
  async recordManual(dto: ManualPaymentDto, actor: AdminUser): Promise<PaymentChange & { payment: ReturnType<typeof toPayment> }> {
    const userId = actor.id;
    const reservationId = BigInt(dto.orderId);
    const { confirmedNow, createdId } = await this.prisma.$transaction(async (tx) => {
      // Bloquea la reserva: dos altas simultáneas no pueden pasarse del saldo.
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${reservationId} FOR UPDATE`;
      const reservation = await tx.reservation.findUnique({ where: { id: reservationId } });
      if (!reservation) throw new NotFoundException('La orden no existe.');
      if (CLOSED_STATUSES.includes(reservation.status)) {
        throw new BadRequestException('La orden está cancelada o el cliente no se presentó: no admite cobros.');
      }
      const amount = new Prisma.Decimal(dto.amount);
      const balance = reservation.total.minus((await paymentTotals(tx, reservationId)).paid);
      if (amount.greaterThan(balance)) {
        throw new BadRequestException(`El monto es mayor al saldo pendiente (USD ${balance.toFixed(2)}).`);
      }

      const now = new Date();
      const created = await tx.payment.create({
        data: {
          reservationId,
          provider: dto.provider,
          type: PaymentType.CHARGE,
          amount,
          currency: 'USD',
          status: PaymentRecordStatus.SUCCEEDED,
          reference: clean(dto.reference),
          receivedBy: clean(dto.receivedBy),
          note: clean(dto.note),
          recordedBy: userId,
          paidAt: now,
        },
      });

      // Si con esto quedó pagada, el efectivo o la transferencia que se esperaban ya no aplican.
      if (amount.equals(balance)) {
        await tx.payment.updateMany({
          where: {
            reservationId,
            id: { not: created.id },
            type: PaymentType.CHARGE,
            status: PaymentRecordStatus.PENDING,
            provider: { in: [PaymentProvider.CASH, PaymentProvider.TRANSFER] },
          },
          data: { status: PaymentRecordStatus.CANCELLED, note: `Cubierto por el pago #${created.id}`, recordedBy: userId },
        });
      }
      return { confirmedNow: await this.syncReservation(tx, reservationId, userId), createdId: Number(created.id) };
    });
    await this.logPayment(actor, 'PAYMENT_MANUAL', createdId, reservationId, `Registró un cobro de USD ${new Prisma.Decimal(dto.amount).toFixed(2)} (${dto.provider})`, {
      amount: dto.amount,
      provider: dto.provider,
      receivedBy: clean(dto.receivedBy),
      reference: clean(dto.reference),
    });
    const change = await this.afterChange(reservationId, confirmedNow);
    return { ...change, payment: change.payments.find((payment) => payment.id === createdId)! };
  }

  // ---------------- Links de pago ----------------

  async createLink(dto: CreatePaymentLinkDto, actor: AdminUser) {
    const userId = actor.id;
    let reservationId: bigint | null = null;
    if (dto.orderId) {
      reservationId = BigInt(dto.orderId);
      const reservation = await this.prisma.reservation.findUnique({ where: { id: reservationId } });
      if (!reservation) throw new NotFoundException('La orden no existe.');
      if (CLOSED_STATUSES.includes(reservation.status) || reservation.status === ReservationStatus.COMPLETED) {
        throw new BadRequestException('Solo se pueden pedir pagos de órdenes activas.');
      }
      const balance = reservation.total.minus((await paymentTotals(this.prisma, reservationId)).paid);
      if (new Prisma.Decimal(dto.amount).greaterThan(balance)) {
        throw new BadRequestException(`No puede ser mayor al saldo de la orden (USD ${balance.toFixed(2)}).`);
      }
    }

    const link = await this.prisma.paymentLink.create({
      data: {
        // 12 caracteres URL-safe (72 bits): imposible de adivinar.
        token: randomBytes(9).toString('base64url'),
        reservationId,
        customerName: dto.customerName.trim(),
        customerEmail: clean(dto.customerEmail)?.toLowerCase() ?? null,
        customerPhone: clean(dto.customerPhone),
        description: dto.description.trim(),
        amount: new Prisma.Decimal(dto.amount),
        currency: 'USD',
        expiresAt: new Date(Date.now() + dto.validHours * 3_600_000),
        createdBy: userId,
      },
      include: linkInclude,
    });
    await this.audit.record(actor, {
      action: 'PAYMENT_LINK_CREATED',
      entityType: 'PAYMENT_LINK',
      entityId: link.id,
      orderCode: reservationId ? await this.audit.orderCode(reservationId) : null,
      summary: `Creó un link de pago de USD ${new Prisma.Decimal(dto.amount).toFixed(2)} para ${dto.customerName.trim()}`,
      details: { amount: dto.amount, description: dto.description.trim() },
    });
    return toPaymentLink(link, this.siteUrl());
  }

  async cancelLink(id: number, actor: AdminUser) {
    const cancelled = await this.prisma.paymentLink.updateMany({
      where: { id: BigInt(id), status: PaymentLinkStatus.ACTIVE, expiresAt: { gt: new Date() } },
      data: { status: PaymentLinkStatus.CANCELLED },
    });
    if (cancelled.count === 0) throw new ConflictException('Solo se pueden cancelar links activos.');
    const link = await this.prisma.paymentLink.findUniqueOrThrow({ where: { id: BigInt(id) }, include: linkInclude });
    await this.audit.record(actor, {
      action: 'PAYMENT_LINK_CANCELLED',
      entityType: 'PAYMENT_LINK',
      entityId: id,
      orderCode: link.reservationId ? await this.audit.orderCode(link.reservationId) : null,
      summary: `Canceló el link de pago #${id}`,
    });
    return toPaymentLink(link, this.siteUrl());
  }

  // ---------------- Internos ----------------

  private async logPayment(actor: AdminUser, action: string, paymentId: number, reservationId: bigint, text: string, details: Prisma.InputJsonValue) {
    const orderCode = await this.audit.orderCode(reservationId);
    await this.audit.record(actor, {
      action,
      entityType: 'PAYMENT',
      entityId: paymentId,
      orderCode,
      summary: `${text} #${paymentId}${orderCode ? ` de la orden ${orderCode}` : ''}`,
      details,
    });
  }

  /**
   * Recalcula payment_status con los pagos guardados. Si la orden seguía
   * PENDIENTE y quedó pagada, la confirma. Devuelve true si la confirmó.
   */
  private async syncReservation(tx: Tx, reservationId: bigint, userId: number): Promise<boolean> {
    const reservation = await tx.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    const { refunded, paid } = await paymentTotals(tx, reservationId);

    let paymentStatus: PaymentStatus;
    if (paid.greaterThanOrEqualTo(reservation.total)) paymentStatus = PaymentStatus.PAID;
    else if (refunded.greaterThan(0)) paymentStatus = paid.greaterThan(0) ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED;
    else paymentStatus = reservation.paymentStatus === PaymentStatus.FAILED ? PaymentStatus.FAILED : PaymentStatus.UNPAID;

    const confirm = paymentStatus === PaymentStatus.PAID && reservation.status === ReservationStatus.PENDING;
    await tx.reservation.update({
      where: { id: reservationId },
      data: { paymentStatus, ...(confirm ? { status: ReservationStatus.CONFIRMED, expiresAt: null } : {}) },
    });
    if (confirm) {
      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: ReservationStatus.PENDING,
          toStatus: ReservationStatus.CONFIRMED,
          changedBy: userId,
          comment: 'Pago registrado en el panel',
        },
      });
    }
    return confirm;
  }

  private async afterChange(reservationId: bigint, confirmedNow: boolean): Promise<PaymentChange> {
    // Fuera de la transacción: el correo sale solo si la confirmación ya quedó guardada.
    if (confirmedNow) await this.emails.sendConfirmation(reservationId);
    const [order, payments] = await Promise.all([
      this.orders.get(Number(reservationId)),
      this.prisma.payment.findMany({ where: { reservationId }, include: paymentInclude, orderBy: { createdAt: 'desc' } }),
    ]);
    return { order, payments: payments.map(toPayment) };
  }

  private siteUrl(): string {
    return this.config.getOrThrow<string>('PUBLIC_SITE_URL').replace(/\/+$/, '');
  }
}

/** Reembolsado y cobrado neto (cobros exitosos menos reembolsos exitosos). */
async function paymentTotals(db: Tx | PrismaService, reservationId: bigint) {
  const totals = await db.payment.groupBy({
    by: ['type'],
    where: { reservationId, status: PaymentRecordStatus.SUCCEEDED },
    _sum: { amount: true },
  });
  const sum = (type: PaymentType) => totals.find((row) => row.type === type)?._sum.amount ?? new Prisma.Decimal(0);
  const refunded = sum(PaymentType.REFUND);
  return { refunded, paid: sum(PaymentType.CHARGE).minus(refunded) };
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
