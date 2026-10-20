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

/** Estado que reciben los tramos aún abiertos cuando la orden se cierra completa. */
const LEG_STATUS_OF_ORDER: Partial<Record<ReservationStatus, LegStatus>> = {
  COMPLETED: LegStatus.COMPLETED,
  CANCELLED: LegStatus.CANCELLED,
  NO_SHOW: LegStatus.NO_SHOW,
};

/** Un tramo abierto todavía no se completa, cancela ni se marca como no show. */
const OPEN_LEG_STATUS: LegStatus[] = [LegStatus.SCHEDULED, LegStatus.ASSIGNED, LegStatus.IN_PROGRESS];

/**
 * Estado de la orden a partir de sus tramos. Mientras quede un tramo abierto la orden sigue como está.
 * Cerrados todos: si algún tramo se completó, la orden está completada (hubo servicio); si no, no show
 * cuando alguno fue no show, y cancelada en los demás casos.
 */
function orderStatusFromLegs(legs: LegStatus[]): ReservationStatus | null {
  if (legs.some((status) => OPEN_LEG_STATUS.includes(status))) return null;
  if (legs.includes(LegStatus.COMPLETED)) return ReservationStatus.COMPLETED;
  if (legs.includes(LegStatus.NO_SHOW)) return ReservationStatus.NO_SHOW;
  return ReservationStatus.CANCELLED;
}

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
        const driver: Prisma.ReservationLegUpdateInput = {};
        if (change.driverName !== undefined) driver.driverName = clean(change.driverName);
        if (change.driverPhone !== undefined) driver.driverPhone = clean(change.driverPhone);
        if (Object.keys(driver).length === 0) continue;
        await tx.reservationLeg.update({
          where: { reservationId_legNumber: { reservationId, legNumber: change.legNumber } },
          data: driver,
        });
      }

      // La orden se cierra completa: los tramos que seguían abiertos reciben el mismo estado.
      const legStatusOfOrder = LEG_STATUS_OF_ORDER[nextStatus];
      if (statusChanged && legStatusOfOrder) {
        await tx.reservationLeg.updateMany({
          where: { reservationId, status: { in: OPEN_LEG_STATUS } },
          data: { status: legStatusOfOrder },
        });
      }

      // Cierre de un solo tramo (completarlo, cancelarlo o marcarlo no show) sin tocar el otro.
      const legClosures = (dto.legs ?? []).filter((change) => change.status);
      if (legClosures.length > 0) {
        if (statusChanged || current.status !== ReservationStatus.CONFIRMED) {
          throw new BadRequestException('Solo se puede cerrar un tramo cuando la orden está confirmada.');
        }
        for (const change of legClosures) {
          const leg = current.legs.find((candidate) => candidate.legNumber === change.legNumber)!;
          if (!OPEN_LEG_STATUS.includes(leg.status)) {
            throw new BadRequestException(`El tramo ${change.legNumber} ya está cerrado.`);
          }
          await tx.reservationLeg.update({
            where: { reservationId_legNumber: { reservationId, legNumber: change.legNumber } },
            data: { status: change.status },
          });
        }
      }

      // El estado de la orden sigue al de sus tramos cuando el último queda cerrado.
      let finalStatus = nextStatus;
      if (legClosures.length > 0) {
        const legs = await tx.reservationLeg.findMany({ where: { reservationId }, select: { status: true } });
        const derived = orderStatusFromLegs(legs.map((leg) => leg.status));
        if (derived) {
          finalStatus = derived;
          await tx.reservation.update({ where: { id: reservationId }, data: { status: derived } });
        }
      }
      if (finalStatus === current.status) return null;

      await tx.reservationStatusHistory.create({
        data: {
          reservationId,
          fromStatus: current.status,
          toStatus: finalStatus,
          changedBy: userId,
          comment: finalStatus === nextStatus ? 'Cambio desde el panel' : 'Todos los tramos cerrados',
        },
      });

      if (finalStatus === ReservationStatus.CANCELLED || finalStatus === ReservationStatus.NO_SHOW) {
        // El efectivo o la transferencia que se esperaban ya no se van a cobrar.
        await tx.payment.updateMany({
          where: { reservationId, type: PaymentType.CHARGE, status: PaymentRecordStatus.PENDING, provider: { in: ['CASH', 'TRANSFER'] } },
          data: {
            status: PaymentRecordStatus.CANCELLED,
            note: finalStatus === 'CANCELLED' ? 'Orden cancelada' : 'El cliente no se presentó',
            recordedBy: userId,
          },
        });
      }
      return finalStatus;
    });

    // Correos del cliente según el nuevo estado (fuera de la transacción, ya guardado el cambio).
    if (changedTo === ReservationStatus.CONFIRMED) await this.emails.sendConfirmation(reservationId);
    else if (changedTo === ReservationStatus.COMPLETED) await this.emails.sendKind(reservationId, 'RESERVATION_COMPLETED');
    // Al cancelar no se envía ningún correo al cliente.

    return this.get(id);
  }
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
