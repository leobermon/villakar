import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Coupon, PaymentStatus, Prisma, ReservationStatus } from '@prisma/client';
import { formatLocalDateTime } from '../../common/utils/time';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminUser } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { CreateCouponDto, UpdateCouponDto } from './dto';

/** Cupón tal como lo ve el panel. Las fechas son hora local de Cancún ('YYYY-MM-DDTHH:MM'). */
export interface ManagedCoupon {
  id: number;
  code: string;
  description: string | null;
  discountOneWay: number;
  discountRoundTrip: number;
  validFrom: string;
  validTo: string;
  maxUses: number | null;
  isActive: boolean;
  /** Usos vigentes (sin contar reservas canceladas o vencidas sin pagar). */
  uses: number;
  createdAt: string;
}

/** Fecha local 'YYYY-MM-DDTHH:MM' → Date "de pared" (campos UTC = hora de Cancún). */
function parseLocal(value: string): Date {
  return new Date(`${value}:00.000Z`);
}

@Injectable()
export class AdminCouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<ManagedCoupon[]> {
    const coupons = await this.prisma.coupon.findMany({ orderBy: [{ isActive: 'desc' }, { validTo: 'desc' }] });
    const uses = await this.countUses(coupons.map((coupon) => coupon.id));
    return coupons.map((coupon) => toManaged(coupon, uses.get(coupon.id) ?? 0));
  }

  async create(dto: CreateCouponDto, actor: AdminUser): Promise<ManagedCoupon> {
    const validFrom = parseLocal(dto.validFrom);
    const validTo = parseLocal(dto.validTo);
    assertRange(validFrom, validTo);
    if (await this.prisma.coupon.findUnique({ where: { code: dto.code }, select: { id: true } })) {
      throw new ConflictException('Ya existe un cupón con ese código.');
    }
    const coupon = await this.prisma.coupon.create({
      data: {
        code: dto.code,
        description: dto.description || null,
        discountOneWay: dto.discountOneWay,
        discountRoundTrip: dto.discountRoundTrip,
        validFrom,
        validTo,
        maxUses: dto.maxUses,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit.record(actor, {
      action: 'COUPON_CREATED',
      entityType: 'COUPON',
      entityId: coupon.id,
      summary: `Creó el cupón ${coupon.code} (One way −${dto.discountOneWay} USD, Round trip −${dto.discountRoundTrip} USD)`,
    });
    return toManaged(coupon, 0);
  }

  async update(id: number, dto: UpdateCouponDto, actor: AdminUser): Promise<ManagedCoupon> {
    const current = await this.prisma.coupon.findUnique({ where: { id: BigInt(id) } });
    if (!current) throw new NotFoundException('El cupón no existe.');

    const validFrom = dto.validFrom ? parseLocal(dto.validFrom) : current.validFrom;
    const validTo = dto.validTo ? parseLocal(dto.validTo) : current.validTo;
    assertRange(validFrom, validTo);

    const data: Prisma.CouponUpdateInput = {};
    if (dto.description !== undefined) data.description = dto.description || null;
    if (dto.discountOneWay !== undefined) data.discountOneWay = dto.discountOneWay;
    if (dto.discountRoundTrip !== undefined) data.discountRoundTrip = dto.discountRoundTrip;
    if (dto.validFrom) data.validFrom = validFrom;
    if (dto.validTo) data.validTo = validTo;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    const coupon = await this.prisma.coupon.update({ where: { id: current.id }, data });
    const uses = (await this.countUses([coupon.id])).get(coupon.id) ?? 0;
    await this.audit.record(actor, {
      action: dto.isActive !== undefined && dto.isActive !== current.isActive ? 'COUPON_TOGGLED' : 'COUPON_UPDATED',
      entityType: 'COUPON',
      entityId: coupon.id,
      summary:
        dto.isActive !== undefined && dto.isActive !== current.isActive
          ? `${dto.isActive ? 'Activó' : 'Desactivó'} el cupón ${coupon.code}`
          : `Editó el cupón ${coupon.code}`,
    });
    return toManaged(coupon, uses);
  }

  /** Usos vigentes por cupón: se descartan las reservas canceladas o vencidas sin pagar. */
  private async countUses(ids: bigint[]): Promise<Map<bigint, number>> {
    if (ids.length === 0) return new Map();
    const grouped = await this.prisma.couponRedemption.groupBy({
      by: ['couponId'],
      where: {
        couponId: { in: ids },
        NOT: {
          reservation: {
            OR: [
              { status: ReservationStatus.CANCELLED },
              { status: ReservationStatus.PENDING, paymentStatus: PaymentStatus.UNPAID, expiresAt: { lt: new Date() } },
            ],
          },
        },
      },
      _count: { _all: true },
    });
    return new Map(grouped.map((row) => [row.couponId, row._count._all]));
  }
}

function assertRange(validFrom: Date, validTo: Date): void {
  if (validTo <= validFrom) throw new BadRequestException('La fecha de fin debe ser posterior a la de inicio.');
}

function toManaged(coupon: Coupon, uses: number): ManagedCoupon {
  return {
    id: Number(coupon.id),
    code: coupon.code,
    description: coupon.description,
    discountOneWay: coupon.discountOneWay.toNumber(),
    discountRoundTrip: coupon.discountRoundTrip.toNumber(),
    validFrom: formatLocalDateTime(coupon.validFrom),
    validTo: formatLocalDateTime(coupon.validTo),
    maxUses: coupon.maxUses,
    isActive: coupon.isActive,
    uses,
    createdAt: coupon.createdAt.toISOString(),
  };
}
