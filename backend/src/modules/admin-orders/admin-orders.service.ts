import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LegStatus, PaymentRecordStatus, PaymentType, Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { AdminOrder, orderInclude, toOrder } from './admin-orders.mappers';
import { UpdateOrderDto } from './dto';

/** Cambios de estado permitidos desde el panel (igual que frontend/admin/src/config/orders.ts). */
const STATUS_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'CANCELLED', 'NO_SHOW'],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const STATUS_LABEL: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  COMPLETED: 'Completado',
  CANCELLED: 'Cancelado',
  NO_SHOW: 'No show',
};

/** Estado de los tramos cuando la orden termina sin servicio. */
const CLOSED_LEG_STATUS: Partial<Record<ReservationStatus, LegStatus>> = {
  CANCELLED: LegStatus.CANCELLED,
  NO_SHOW: LegStatus.NO_SHOW,
};

/** Órdenes (reservas) para el panel: listado y cambios de estado, notas y choferes. */
@Injectable()
export class AdminOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: ReservationEmailsService,
  ) {}

  async list(): Promise<AdminOrder[]> {
    const rows = await this.prisma.reservation.findMany({ include: orderInclude, orderBy: { createdAt: 'desc' } });
    return rows.map(toOrder);
  }

  async get(id: number): Promise<AdminOrder> {
    const row = await this.prisma.reservation.findUnique({ where: { id: BigInt(id) }, include: orderInclude });
    if (!row) throw new NotFoundException('La orden no existe.');
    return toOrder(row);
  }

  async update(id: number, dto: UpdateOrderDto, userId: number): Promise<AdminOrder> {
    const reservationId = BigInt(id);
    const changedTo = await this.prisma.$transaction(async (tx): Promise<ReservationStatus | null> => {
      const current = await tx.reservation.findUnique({
        where: { id: reservationId },
        include: { legs: { orderBy: { legNumber: 'asc' } } },
      });
      if (!current) throw new NotFoundException('La orden no existe.');

      for (const change of dto.legs ?? []) {
        if (!current.legs.some((leg) => leg.legNumber === change.legNumber)) {
          throw new BadRequestException(`La orden no tiene el tramo ${change.legNumber}.`);
        }
      }

      const nextStatus = dto.status ?? current.status;
      const statusChanged = nextStatus !== current.status;
      if (statusChanged && !STATUS_TRANSITIONS[current.status].includes(nextStatus)) {
        throw new BadRequestException(
          `No se puede pasar de "${STATUS_LABEL[current.status]}" a "${STATUS_LABEL[nextStatus]}".`,
        );
      }

      const data: Prisma.ReservationUpdateInput = {};
      if (statusChanged) data.status = nextStatus;
      if (dto.internalNotes !== undefined) data.internalNotes = clean(dto.internalNotes);
      if (Object.keys(data).length > 0) await tx.reservation.update({ where: { id: reservationId }, data });

      for (const change of dto.legs ?? []) {
        await tx.reservationLeg.update({
          where: { reservationId_legNumber: { reservationId, legNumber: change.legNumber } },
          data: { driverName: clean(change.driverName), driverPhone: clean(change.driverPhone) },
        });
      }

      if (!statusChanged) return null;
      await tx.reservationStatusHistory.create({
        data: { reservationId, fromStatus: current.status, toStatus: nextStatus, changedBy: userId, comment: 'Cambio desde el panel' },
      });

      const closedLegStatus = CLOSED_LEG_STATUS[nextStatus];
      if (closedLegStatus) {
        await tx.reservationLeg.updateMany({ where: { reservationId }, data: { status: closedLegStatus } });
        // El efectivo o la transferencia que se esperaban ya no se van a cobrar.
        await tx.payment.updateMany({
          where: { reservationId, type: PaymentType.CHARGE, status: PaymentRecordStatus.PENDING, provider: { in: ['CASH', 'TRANSFER'] } },
          data: {
            status: PaymentRecordStatus.CANCELLED,
            note: nextStatus === 'CANCELLED' ? 'Orden cancelada' : 'El cliente no se presentó',
            recordedBy: userId,
          },
        });
      }
      return nextStatus;
    });

    // Correos del cliente según el nuevo estado (fuera de la transacción, ya guardado el cambio).
    if (changedTo === ReservationStatus.CONFIRMED) await this.emails.sendConfirmation(reservationId);
    else if (changedTo === ReservationStatus.COMPLETED) await this.emails.sendKind(reservationId, 'RESERVATION_COMPLETED');
    else if (changedTo === ReservationStatus.CANCELLED) await this.emails.sendKind(reservationId, 'RESERVATION_CANCELLED');

    return this.get(id);
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
