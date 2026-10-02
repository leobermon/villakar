import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationsService, ReservationSummary } from '../reservations/reservations.service';
import { MailService } from './mail.service';

// Colores de la paleta del sitio (frontend/booking/src/style.css).
const NAVY = '#023e8a';
const BLUE = '#0077b6';
const CREAM = '#fdfcf5';
const SAND = '#f1f1e6';
const MUTED = '#5b6b86';

@Injectable()
export class ReservationEmailsService {
  private readonly logger = new Logger(ReservationEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: ReservationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Envía el correo de confirmación una sola vez por reserva. Se reclama la
   * reserva marcando confirmation_email_sent_at antes de enviar (así el webhook
   * y el regreso del cliente no mandan dos correos) y se libera si el envío falla.
   * Nunca lanza: un correo fallido no debe tumbar la confirmación del pago.
   */
  async sendConfirmation(reservationId: bigint): Promise<void> {
    try {
      const claimed = await this.prisma.reservation.updateMany({
        where: { id: reservationId, confirmationEmailSentAt: null },
        data: { confirmationEmailSentAt: new Date() },
      });
      if (claimed.count === 0) return;

      const summary = await this.reservations.findSummaryById(reservationId);
      const sent = await this.mail.send({
        to: summary.customer.email,
        subject: `Your transfer is confirmed · ${summary.code}`,
        html: this.renderHtml(summary),
        text: this.renderText(summary),
      });
      if (!sent) {
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: { confirmationEmailSentAt: null },
        });
      }
    } catch (error) {
      this.logger.error(`Confirmation email for reservation ${reservationId} failed: ${String(error)}`);
    }
  }

  private reservationUrl(code: string): string {
    return `${this.config.getOrThrow<string>('PUBLIC_SITE_URL').replace(/\/+$/, '')}/reservation/${code}`;
  }

  private renderText(r: ReservationSummary): string {
    const lines = [
      `Hi ${r.customer.firstName},`,
      '',
      `Your private transfer is confirmed. Reservation code: ${r.code}`,
      '',
      ...r.legs.flatMap((leg) => [
        `${legLabel(r, leg.legNumber)}: ${leg.originName} → ${leg.destinationName}`,
        `  Pickup: ${formatLocal(leg.pickupAt)}`,
        ...(leg.flightNumber ? [`  Flight: ${flightLine(leg)}`] : []),
        '',
      ]),
      `Vehicle: ${r.vehicleName} · ${r.passengers} ${r.passengers === 1 ? 'passenger' : 'passengers'}`,
      paymentLine(r),
      ...(r.specialRequests ? ['', `Special requests: ${r.specialRequests}`] : []),
      '',
      `View your reservation: ${this.reservationUrl(r.code)}`,
      '',
      'VillaKar Transfers · Cancun & Riviera Maya',
    ];
    return lines.join('\n');
  }

  private renderHtml(r: ReservationSummary): string {
    const legs = r.legs
      .map(
        (leg) => `
        <tr><td style="padding:16px 20px;border-top:1px solid ${SAND};">
          <div style="font-size:12px;color:${BLUE};font-weight:600;">${esc(legLabel(r, leg.legNumber))}</div>
          <div style="font-size:15px;font-weight:600;color:${NAVY};margin-top:2px;">${esc(leg.originName)} → ${esc(leg.destinationName)}</div>
          <div style="font-size:14px;color:${NAVY};margin-top:6px;">Pickup: <strong>${esc(formatLocal(leg.pickupAt))}</strong></div>
          ${leg.flightNumber ? `<div style="font-size:14px;color:${MUTED};margin-top:2px;">Flight: ${esc(flightLine(leg))}</div>` : ''}
        </td></tr>`,
      )
      .join('');

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reservation ${esc(r.code)}</title></head>
<body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${SAND};">
        <tr><td style="background:${NAVY};color:#ffffff;padding:20px;">
          <div style="font-size:20px;font-weight:700;">Your transfer is confirmed</div>
          <div style="font-size:14px;opacity:.85;margin-top:4px;">Hi ${esc(r.customer.firstName)}, here are your booking details.</div>
          <div style="font-size:12px;opacity:.75;margin-top:14px;">Reservation code</div>
          <div style="font-size:22px;font-weight:700;letter-spacing:3px;">${esc(r.code)}</div>
        </td></tr>
        ${legs}
        <tr><td style="padding:16px 20px;border-top:1px solid ${SAND};font-size:14px;">
          <div>Vehicle: <strong>${esc(r.vehicleName)}</strong> · ${r.passengers} ${r.passengers === 1 ? 'passenger' : 'passengers'}</div>
          <div style="margin-top:6px;">${esc(paymentLine(r))}</div>
          ${r.specialRequests ? `<div style="margin-top:6px;color:${MUTED};">Special requests: ${esc(r.specialRequests)}</div>` : ''}
        </td></tr>
        <tr><td style="padding:8px 20px 24px;">
          <a href="${esc(this.reservationUrl(r.code))}" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;">View your reservation</a>
        </td></tr>
      </table>
      <div style="font-size:12px;color:${MUTED};margin-top:16px;">VillaKar Transfers · Cancun &amp; Riviera Maya</div>
    </td></tr>
  </table>
</body></html>`;
  }
}

function legLabel(r: ReservationSummary, legNumber: number): string {
  if (r.legs.length === 1) return 'Your transfer';
  return legNumber === 1 ? 'Outbound' : 'Return';
}

function flightLine(leg: ReservationSummary['legs'][number]): string {
  const parts = [`${leg.airline ?? ''} ${leg.flightNumber ?? ''}`.trim()];
  if (leg.flightTime) parts.push(formatLocal(leg.flightTime));
  if (leg.terminal) parts.push(`Terminal ${leg.terminal.slice(1)}`);
  return parts.join(' · ');
}

function paymentLine(r: ReservationSummary): string {
  const total = `$${r.total.toFixed(2)} USD`;
  if (r.paymentStatus === 'PAID') return `Paid online: ${total}`;
  if (r.payInCash) return `Pay ${total} in cash to your driver after the service.`;
  return `Total: ${total}`;
}

/** 'YYYY-MM-DDTHH:MM' (hora local de Cancún) → "Tue, Oct 20, 2026, 11:05 AM". */
function formatLocal(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(`${value}:00Z`));
}

/** Escapa texto del cliente (nombres, hoteles, peticiones) antes de meterlo en HTML. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
