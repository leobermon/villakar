import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EmailKind, Prisma, ReservationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { UpdateContactRequestDto } from './dto';

const emailInclude = {
  reservation: { select: { code: true, customer: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.EmailLogInclude;

type EmailLogRow = Prisma.EmailLogGetPayload<{ include: typeof emailInclude }>;

export interface AdminEmail {
  id: number;
  kind: EmailKind;
  reservationId: number | null;
  reservationCode: string | null;
  customerName: string | null;
  toEmail: string;
  subject: string;
  status: 'SENT' | 'FAILED';
  error: string | null;
  createdAt: string;
}

export interface AdminContactRequest {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  hotelName: string;
  arrivalDate: string | null;
  passengers: number | null;
  message: string | null;
  status: 'NEW' | 'CONTACTED' | 'CLOSED';
  internalNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Qué correos tiene sentido enviar según el estado de la orden (reenvíos desde el panel). */
const ALLOWED_BY_STATUS: Record<ReservationStatus, EmailKind[]> = {
  PENDING: ['RESERVATION_PENDING'],
  CONFIRMED: ['RESERVATION_CONFIRMATION'],
  COMPLETED: ['RESERVATION_CONFIRMATION', 'RESERVATION_COMPLETED'],
  CANCELLED: ['RESERVATION_CANCELLED'],
  NO_SHOW: [],
};

function toEmail(row: EmailLogRow): AdminEmail {
  return {
    id: Number(row.id),
    kind: row.kind,
    reservationId: row.reservationId === null ? null : Number(row.reservationId),
    reservationCode: row.reservation?.code ?? null,
    customerName: row.reservation ? `${row.reservation.customer.firstName} ${row.reservation.customer.lastName}`.trim() : null,
    toEmail: row.toEmail,
    subject: row.subject,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  };
}

function toContact(row: Prisma.ContactRequestGetPayload<object>): AdminContactRequest {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    phone: row.phone,
    hotelName: row.hotelName,
    arrivalDate: row.arrivalDate ? row.arrivalDate.toISOString().slice(0, 10) : null,
    passengers: row.passengers,
    message: row.message,
    status: row.status,
    internalNotes: row.internalNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Correos enviados por el sistema y solicitudes del formulario "Contact us", para el panel. */
@Injectable()
export class AdminMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emails: ReservationEmailsService,
  ) {}

  async listEmails(): Promise<AdminEmail[]> {
    const rows = await this.prisma.emailLog.findMany({
      include: emailInclude,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map(toEmail);
  }

  /** Historial de correos de una orden: el más reciente primero. */
  async listOrderEmails(reservationId: number): Promise<AdminEmail[]> {
    const id = BigInt(reservationId);
    const reservation = await this.prisma.reservation.findUnique({ where: { id }, select: { id: true } });
    if (!reservation) throw new NotFoundException('La orden no existe.');
    const rows = await this.prisma.emailLog.findMany({
      where: { reservationId: id },
      include: emailInclude,
      orderBy: { id: 'desc' },
    });
    return rows.map(toEmail);
  }

  /** Reenvía un correo de una orden y devuelve cómo salió. Solo los que corresponden a su estado actual. */
  async resend(reservationId: number, kind: EmailKind): Promise<{ sent: boolean; error: string | null; email: AdminEmail | null }> {
    const id = BigInt(reservationId);
    const reservation = await this.prisma.reservation.findUnique({ where: { id }, select: { id: true, status: true } });
    if (!reservation) throw new NotFoundException('La orden no existe.');
    if (!ALLOWED_BY_STATUS[reservation.status].includes(kind)) {
      throw new BadRequestException('Ese correo no corresponde al estado actual de la orden.');
    }

    const result = await this.emails.resend(id, kind);
    const latest = await this.prisma.emailLog.findFirst({
      where: { reservationId: id },
      include: emailInclude,
      orderBy: { id: 'desc' },
    });
    return { sent: result.ok, error: result.ok ? null : result.error, email: latest ? toEmail(latest) : null };
  }

  async listContactRequests(): Promise<AdminContactRequest[]> {
    const rows = await this.prisma.contactRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 500 });
    return rows.map(toContact);
  }

  async updateContactRequest(id: number, dto: UpdateContactRequestDto): Promise<AdminContactRequest> {
    const current = await this.prisma.contactRequest.findUnique({ where: { id: BigInt(id) }, select: { id: true } });
    if (!current) throw new NotFoundException('La solicitud no existe.');
    const notes = dto.internalNotes === undefined ? undefined : dto.internalNotes?.trim() || null;
    const row = await this.prisma.contactRequest.update({
      where: { id: BigInt(id) },
      data: { status: dto.status, internalNotes: notes },
    });
    return toContact(row);
  }
}
