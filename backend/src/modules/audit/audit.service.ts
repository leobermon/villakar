import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminUser } from '../auth/auth.service';

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId?: number | bigint | null;
  /** Código de la orden relacionada (ej. VC5U4DWT2H). */
  orderCode?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
}

export interface AuditFilters {
  userId?: number;
  action?: string;
  query?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

/** Historial de movimientos del panel. Registrar nunca debe tumbar la operación que se audita. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(actor: AdminUser, ...entries: AuditEntry[]): Promise<void> {
    if (entries.length === 0) return;
    try {
      await this.prisma.auditLog.createMany({
        data: entries.map((entry) => ({
          userId: BigInt(actor.id),
          userName: actor.name,
          userEmail: actor.email,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId == null ? null : BigInt(entry.entityId),
          orderCode: entry.orderCode ?? null,
          summary: entry.summary.slice(0, 500),
          details: entry.details,
        })),
      });
    } catch (error) {
      this.logger.error(`No se pudo guardar el historial: ${String(error)}`);
    }
  }

  /** Código de una orden, para etiquetar movimientos de pagos. */
  async orderCode(reservationId: bigint): Promise<string | null> {
    const row = await this.prisma.reservation.findUnique({ where: { id: reservationId }, select: { code: true } });
    return row?.code ?? null;
  }

  async list(filters: AuditFilters) {
    const where: Prisma.AuditLogWhereInput = {};
    if (filters.userId) where.userId = BigInt(filters.userId);
    if (filters.action) where.action = filters.action;
    if (filters.query) {
      where.OR = [{ orderCode: { contains: filters.query } }, { summary: { contains: filters.query } }];
    }
    const range: Prisma.DateTimeFilter = {};
    if (filters.from) range.gte = new Date(`${filters.from}T00:00:00`);
    if (filters.to) range.lte = new Date(`${filters.to}T23:59:59`);
    if (range.gte || range.lte) where.createdAt = range;

    const [total, rows, users] = await this.prisma.$transaction([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.auditLog.groupBy({ by: ['userId', 'userName'], orderBy: { userName: 'asc' } }),
    ]);

    return {
      total,
      items: rows.map((row) => ({
        id: Number(row.id),
        at: row.createdAt.toISOString(),
        userId: row.userId === null ? null : Number(row.userId),
        userName: row.userName,
        userEmail: row.userEmail,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId === null ? null : Number(row.entityId),
        orderCode: row.orderCode,
        summary: row.summary,
        details: row.details,
      })),
      users: users.filter((user) => user.userId !== null).map((user) => ({ id: Number(user.userId), name: user.userName })),
    };
  }
}
