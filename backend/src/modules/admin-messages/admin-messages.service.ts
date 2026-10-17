import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationEmailsService } from '../notifications/reservation-emails.service';
import { UpdateContactRequestDto } from './dto';

const emailInclude = {
  reservation: { select: { code: true, customer: { select: { firstName: true, lastName: true } } } },
} satisfies Prisma.EmailLogInclude;

type EmailLogRow = Prisma.EmailLogGetPayload<{ include: typeof emailInclude }>;

export interface AdminEmail {
  id: number;
  kind: 'RESERVATION_CONFIRMATION';
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

  /** Reenvía el correo de confirmación de una orden y devuelve cómo salió. */
  async resendConfirmation(reservationId: number): Promise<{ sent: boolean; error: string | null; email: AdminEmail | null }> {
    const id = BigInt(reservationId);
    const reservation = await this.prisma.reservation.findUnique({ where: { id }, select: { id: true } });
    if (!reservation) throw new NotFoundException('La orden no existe.');

    const result = await this.emails.resendConfirmation(id);
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
