import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailKind } from '@prisma/client';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { PrismaService } from '../../prisma/prisma.service';
import { ReservationsService, ReservationSummary } from '../reservations/reservations.service';
import { SettingsService } from '../settings/settings.service';
import type { CompanySettings } from '../settings/settings.types';
import { MailService } from './mail.service';

// Colores de la paleta del sitio (frontend/booking/src/style.css).
const NAVY = '#023e8a';
const BLUE = '#0077b6';
const CREAM = '#fdfcf5';
const SAND = '#f1f1e6';
const BORDER = '#e3eef7';
const MUTED = '#5b6b86';

export type SendResult = { ok: true } | { ok: false; error: string };

/** Textos y colores de cada correo al cliente. Se escriben en inglés, como todo el sitio. */
interface EmailCopy {
  subject: (code: string) => string;
  heading: string;
  intro: (name: string) => string;
  /** Párrafo bajo el encabezado que explica qué sigue. */
  note: string;
  icon: string;
  banner: string;
  circle: string;
  /** Botón del final: lleva a la reservación o al sitio para reservar de nuevo. */
  button: { label: string; to: 'reservation' | 'site' };
  /** Muestra el aviso de pago en efectivo (solo en la confirmación). */
  showCash: boolean;
}

const COPY: Record<EmailKind, EmailCopy> = {
  RESERVATION_PENDING: {
    subject: (code) => `We received your reservation · ${code}`,
    heading: 'We received your reservation',
    intro: (name) => `Thanks, ${name}.`,
    note: 'Your reservation is saved but it is not confirmed yet. We will confirm it as soon as your payment is completed, and you will receive another email. You can finish your booking at any time from the link below.',
    icon: '&#8987;',
    banner: '#b7791f',
    circle: '#d4a24c',
    button: { label: 'Complete your booking', to: 'reservation' },
    showCash: false,
  },
  RESERVATION_CONFIRMATION: {
    subject: (code) => `Your transfer is confirmed · ${code}`,
    heading: 'Your transfer is confirmed',
    intro: (name) => `Thanks, ${name}.`,
    note: 'Your reservation is confirmed and our team will provide the service on the date and time shown below. We will be ready for you.',
    icon: '&#10003;',
    banner: BLUE,
    circle: '#3392c5',
    button: { label: 'View your reservation', to: 'reservation' },
    showCash: true,
  },
  RESERVATION_COMPLETED: {
    subject: (code) => `Thank you for traveling with us · ${code}`,
    heading: 'Thank you for traveling with us',
    intro: (name) => `Thanks, ${name}!`,
    note: 'Your transfer is complete. Thank you for choosing VillaKar Transfers. We hope you enjoyed the ride and would love to take you on your next trip.',
    icon: '&#10003;',
    banner: '#2f855a',
    circle: '#5fb07f',
    button: { label: 'Book another transfer', to: 'site' },
    showCash: false,
  },
  RESERVATION_CANCELLED: {
    subject: (code) => `Your reservation was canceled · ${code}`,
    heading: 'Your reservation was canceled',
    intro: (name) => `Hello, ${name}.`,
    note: 'This reservation has been canceled and no further action is needed. If you did not ask for the cancellation or you have any questions, please contact us. You are welcome to book a new transfer any time.',
    icon: '&#10005;',
    banner: '#b4443c',
    circle: '#d9776f',
    button: { label: 'Book a new transfer', to: 'site' },
    showCash: false,
  },
};

@Injectable()
export class ReservationEmailsService {
  private readonly logger = new Logger(ReservationEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reservations: ReservationsService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly settings: SettingsService,
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

      const result = await this.deliver(reservationId, 'RESERVATION_CONFIRMATION');
      if (!result.ok) {
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: { confirmationEmailSentAt: null },
        });
      }
    } catch (error) {
      this.logger.error(`Confirmation email for reservation ${reservationId} failed: ${String(error)}`);
    }
  }

  /** "Reserva recibida": sale al reservar en el sitio, con la reserva todavía pendiente. Nunca lanza. */
  async sendPendingByCode(code: string): Promise<void> {
    try {
      const reservation = await this.prisma.reservation.findUnique({ where: { code }, select: { id: true } });
      if (reservation) await this.deliver(reservation.id, 'RESERVATION_PENDING');
    } catch (error) {
      this.logger.error(`Pending email for reservation ${code} failed: ${String(error)}`);
    }
  }

  /** Correo de un cambio de estado hecho desde el panel (completada, cancelada). Nunca lanza. */
  async sendKind(reservationId: bigint, kind: EmailKind): Promise<void> {
    try {
      await this.deliver(reservationId, kind);
    } catch (error) {
      this.logger.error(`${kind} email for reservation ${reservationId} failed: ${String(error)}`);
    }
  }

  /**
   * Reenvío manual desde el panel (el cliente dice que no le llegó). No depende de si
   * ya se había enviado antes. Devuelve el resultado en vez de lanzar.
   */
  async resend(reservationId: bigint, kind: EmailKind): Promise<SendResult> {
    try {
      const result = await this.deliver(reservationId, kind);
      if (result.ok && kind === 'RESERVATION_CONFIRMATION') {
        await this.prisma.reservation.update({
          where: { id: reservationId },
          data: { confirmationEmailSentAt: new Date() },
        });
      }
      return result;
    } catch (error) {
      this.logger.error(`Resend of ${kind} for reservation ${reservationId} failed: ${String(error)}`);
      return { ok: false, error: 'No se pudo preparar el correo.' };
    }
  }

  /**
   * Aviso interno para el equipo: "Nuevo servicio reservado" con los detalles. Sale cuando el cliente
   * crea la reserva (aunque aún no haya pagado) y llega al buzón del propio remitente (o a lo que
   * diga NEW_BOOKING_ALERT_TO). No va al cliente ni se anota en el registro de correos del cliente.
   * Nunca lanza: un aviso fallido no debe afectar la reserva.
   */
  async notifyTeamNewBooking(summary: ReservationSummary): Promise<void> {
    try {
      const setting = (this.config.get<string>('NEW_BOOKING_ALERT_TO') ?? '').trim();
      if (setting.toLowerCase() === 'off') return;

      const { senderEmail } = await this.settings.get('notifications');
      const recipients = (setting ? setting.split(',') : [senderEmail]).map((a) => a.trim()).filter(Boolean);
      if (!recipients.length) return;

      const result = await this.mail.trySend({
        to: recipients.join(', '),
        subject: `Nuevo servicio reservado · ${summary.code}`,
        html: this.renderTeamHtml(summary),
        text: this.renderTeamText(summary),
      });
      if (!result.ok) this.logger.warn(`Team alert for ${summary.code} not sent: ${result.error}`);
    } catch (error) {
      this.logger.error(`Team alert for reservation ${summary.code} failed: ${String(error)}`);
    }
  }

  private renderTeamText(r: ReservationSummary): string {
    return [
      'NUEVO SERVICIO RESERVADO',
      '',
      `Código: ${r.code}`,
      `Estado: ${STATUS_ES[r.status] ?? r.status} · Pago: ${PAYMENT_ES[r.paymentStatus] ?? r.paymentStatus}${r.payInCash ? ' (pagará en efectivo)' : ''}`,
      `Reservado: ${formatInstantCancun(r.createdAt)} (hora de Cancún)`,
      '',
      `Cliente: ${r.customer.firstName} ${r.customer.lastName}`,
      `Correo: ${r.customer.email}`,
      `Teléfono: ${r.customer.phone ?? '—'}`,
      '',
      ...r.legs.flatMap((leg) => [
        `${legLabelEs(r, leg.legNumber).toUpperCase()}: ${leg.originName} → ${leg.destinationName}`,
        `  Recogida: ${formatLocal(leg.pickupAt)}`,
        ...(leg.flightNumber ? [`  Vuelo: ${flightLine(leg)}`] : []),
        '',
      ]),
      `Vehículo: ${r.vehicleName}`,
      `Pasajeros: ${r.passengers}`,
      `Viaje: ${r.tripType === 'ROUND_TRIP' ? 'Redondo' : 'Sencillo'}`,
      `Total: ${usd(r.total)} USD`,
      ...(r.specialRequests ? ['', `Peticiones especiales: ${r.specialRequests}`] : []),
    ].join('\n');
  }

  private renderTeamHtml(r: ReservationSummary): string {
    const row = (label: string, value: string) =>
      `<tr><td style="padding:6px 12px 6px 0;color:${MUTED};font-size:13px;vertical-align:top;white-space:nowrap;">${esc(label)}</td><td style="padding:6px 0;font-size:14px;font-weight:600;color:${NAVY};">${value}</td></tr>`;
    const legs = r.legs
      .map(
        (leg) => `
      <tr><td colspan="2" style="padding:14px 0 4px;font-size:12px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:${BLUE};">${esc(legLabelEs(r, leg.legNumber))}</td></tr>
      ${row('Ruta', `${esc(leg.originName)} → ${esc(leg.destinationName)}`)}
      ${row('Recogida', esc(formatLocal(leg.pickupAt)))}
      ${leg.flightNumber ? row('Vuelo', esc(flightLine(leg))) : ''}`,
      )
      .join('');
    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Nuevo servicio reservado · ${esc(r.code)}</title></head>
<body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="background:${BLUE};border-radius:14px 14px 0 0;padding:16px 20px;color:#ffffff;">
        <div style="font-size:12px;letter-spacing:1px;">AVISO INTERNO</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:700;margin-top:2px;">Nuevo servicio reservado</div>
        <div style="font-size:18px;letter-spacing:3px;font-weight:700;margin-top:6px;">${esc(r.code)}</div>
      </td></tr>
      <tr><td style="background:#ffffff;border:1px solid ${BORDER};border-top:0;border-radius:0 0 14px 14px;padding:12px 20px 20px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${row('Estado', `${esc(STATUS_ES[r.status] ?? r.status)} · Pago: ${esc(PAYMENT_ES[r.paymentStatus] ?? r.paymentStatus)}${r.payInCash ? ' (pagará en efectivo)' : ''}`)}
          ${row('Reservado', esc(`${formatInstantCancun(r.createdAt)} (hora de Cancún)`))}
          ${row('Cliente', esc(`${r.customer.firstName} ${r.customer.lastName}`))}
          ${row('Correo', esc(r.customer.email))}
          ${row('Teléfono', esc(r.customer.phone ?? '—'))}
          ${legs}
          <tr><td colspan="2" style="padding-top:10px;border-top:1px solid ${BORDER};"></td></tr>
          ${row('Vehículo', esc(r.vehicleName))}
          ${row('Pasajeros', String(r.passengers))}
          ${row('Viaje', r.tripType === 'ROUND_TRIP' ? 'Redondo' : 'Sencillo')}
          ${row('Total', `${esc(usd(r.total))} USD`)}
          ${r.specialRequests ? row('Peticiones', `<span style="font-weight:400;white-space:pre-line;">${esc(r.specialRequests)}</span>`) : ''}
        </table>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  }

  /** Arma el correo, lo envía y deja el resultado en el registro de correos. */
  private async deliver(reservationId: bigint, kind: EmailKind): Promise<SendResult> {
    const summary = await this.reservations.findSummaryById(reservationId);
    const company = await this.settings.get('company');
    const subject = COPY[kind].subject(summary.code);
    const result = await this.mail.trySend({
      to: summary.customer.email,
      subject,
      html: this.renderHtml(summary, company, kind),
      text: this.renderText(summary, company, kind),
    });
    await this.prisma.emailLog.create({
      data: {
        kind,
        reservationId,
        toEmail: summary.customer.email,
        subject,
        status: result.ok ? 'SENT' : 'FAILED',
        error: result.ok ? null : result.error,
      },
    });
    return result;
  }

  private siteUrl(): string {
    return this.config.getOrThrow<string>('PUBLIC_SITE_URL').replace(/\/+$/, '');
  }

  private reservationUrl(code: string): string {
    return `${this.siteUrl()}/reservation/${code}`;
  }

  /** Guía de dónde encontrar al chofer: solo si algún tramo sale del aeropuerto; abre en su terminal si se conoce. */
  private airportGuideUrl(r: ReservationSummary): string | null {
    const arrival = r.legs.find((leg) => /airport/i.test(leg.originName));
    if (!arrival) return null;
    const terminal = arrival.terminal ? `#terminal-${arrival.terminal.slice(1)}` : '';
    return `${this.siteUrl()}/airport-pickup${terminal}`;
  }

  private renderText(r: ReservationSummary, company: CompanySettings, kind: EmailKind): string {
    const copy = COPY[kind];
    const contact = contactLines(company);
    const whatsappUrl = whatsappHelpUrl(r, company);
    const lines = [
      company.name,
      '',
      copy.heading,
      copy.intro(r.customer.firstName.trim()),
      '',
      copy.note,
      '',
      `Reservation code: ${r.code}`,
      ...(copy.showCash && cashNote(r) ? ['', cashNote(r)!] : []),
      '',
      ...r.legs.flatMap((leg) => [
        `${legLabel(r, leg.legNumber).toUpperCase()}: ${leg.originName} → ${leg.destinationName}`,
        `  Pickup: ${formatLocal(leg.pickupAt)}`,
        ...(leg.flightNumber ? [`  Flight: ${flightLine(leg)}`] : []),
        '',
      ]),
      `Vehicle: ${r.vehicleName}`,
      `Passengers: ${r.passengers}`,
      `${totalLabel(r, kind)}: ${usd(r.total)} USD`,
      `Lead passenger: ${leadPassenger(r)}`,
      ...(r.specialRequests ? [`Special requests: ${r.specialRequests}`] : []),
      ...(kind === 'RESERVATION_CONFIRMATION' && this.airportGuideUrl(r)
        ? ['', `Where to meet your driver at the airport: ${this.airportGuideUrl(r)}`]
        : []),
      '',
      `${copy.button.label}: ${copy.button.to === 'site' ? this.siteUrl() : this.reservationUrl(r.code)}`,
      ...(contact.length || whatsappUrl
        ? [
            '',
            `Need help? Contact ${company.name}`,
            ...contact.flatMap(([label, value]) => [
              `${label}: ${value}`,
              ...(label === 'Phone' && whatsappUrl ? [`WhatsApp: ${whatsappUrl}`] : []),
            ]),
            ...(whatsappUrl && !contact.some(([label]) => label === 'Phone') ? [`WhatsApp: ${whatsappUrl}`] : []),
          ]
        : []),
      '',
      `${company.name} · Cancun & Riviera Maya`,
    ];
    return lines.join('\n');
  }

  /**
   * Mismo orden que la página de confirmación (frontend/booking/src/views/ReservationView.vue):
   * logo, aviso de confirmada con el código, efectivo, tramos, detalle y contacto.
   * Tablas y estilos en línea para que se vea bien en Gmail y Outlook.
   */
  private renderHtml(r: ReservationSummary, company: CompanySettings, kind: EmailKind): string {
    const copy = COPY[kind];
    const card = `background:#ffffff;border:1px solid ${BORDER};border-radius:16px;`;
    const label = `font-size:12px;color:${MUTED};`;
    const value = `font-size:14px;font-weight:600;color:${NAVY};margin-top:2px;`;
    const spacer = '<tr><td style="height:16px;line-height:16px;font-size:0;">&nbsp;</td></tr>';

    const legs = r.legs
      .map(
        (leg) => `
        <tr><td style="${card}padding:20px;">
          <div style="font-size:12px;font-weight:600;letter-spacing:.5px;text-transform:uppercase;color:${BLUE};">${esc(legLabel(r, leg.legNumber))}</div>
          <div style="font-size:16px;font-weight:600;color:${NAVY};margin-top:4px;">${esc(leg.originName)} → ${esc(leg.destinationName)}</div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;"><tr>
            <td valign="top" style="padding-right:12px;">
              <div style="${label}">Pickup</div>
              <div style="${value}">${esc(formatLocal(leg.pickupAt))}</div>
            </td>
            ${
              leg.flightNumber
                ? `<td valign="top">
              <div style="${label}">Flight</div>
              <div style="${value}">${esc(flightLine(leg))}</div>
            </td>`
                : ''
            }
          </tr></table>
        </td></tr>
        ${spacer}`,
      )
      .join('');

    const contact = contactLines(company);
    const whatsappUrl = whatsappHelpUrl(r, company);
    // Botón con el icono de WhatsApp (PNG: Gmail y Outlook no muestran SVG). Va al lado del teléfono.
    const whatsappButton = (margin: string) =>
      whatsappUrl
        ? `<a href="${esc(whatsappUrl)}" style="display:inline-block;${margin}background:#61d566;color:${NAVY};text-decoration:none;font-weight:700;font-size:13px;padding:5px 14px 5px 7px;border-radius:999px;vertical-align:middle;"><img src="${esc(this.siteUrl())}/email/whatsapp.png" width="20" height="20" alt="" style="vertical-align:middle;border:0;margin-right:6px;"><span style="vertical-align:middle;">WhatsApp</span></a>`
        : '';
    const hasPhone = contact.some(([title]) => title === 'Phone');
    const contactBlock = contact.length || whatsappUrl
      ? `
        ${spacer}
        <tr><td style="${card}padding:20px;">
          <div style="font-size:17px;font-weight:700;color:${NAVY};">Need help? Contact ${esc(company.name)}</div>
          ${contact
            .map(
              ([title, text, href]) => `<div style="${label}margin-top:12px;">${esc(title)}</div>
          <div style="${value}">${href ? `<a href="${esc(href)}" style="color:${NAVY};text-decoration:none;vertical-align:middle;">${esc(text)}</a>` : esc(text)}${title === 'Phone' ? whatsappButton('margin-left:10px;') : ''}</div>`,
            )
            .join('')}
          ${hasPhone ? '' : `<div style="margin-top:16px;">${whatsappButton('')}</div>`}
        </td></tr>`
      : '';

    const guideUrl = kind === 'RESERVATION_CONFIRMATION' ? this.airportGuideUrl(r) : null;
    const guideBlock = guideUrl
      ? `
        ${spacer}
        <tr><td style="${card}padding:20px;">
          <div style="font-size:17px;font-weight:700;color:${NAVY};">Meet your driver at Cancun Airport</div>
          <div style="font-size:14px;line-height:1.5;color:${NAVY};margin-top:6px;">Your driver will be waiting at arrivals, holding a sign with your name. See the map of your terminal and the path from baggage claim to the pickup area.</div>
          <div style="margin-top:14px;"><a href="${esc(guideUrl)}" style="display:inline-block;background:#eaf4fb;color:${BLUE};border:1px solid ${BLUE};text-decoration:none;font-weight:700;font-size:12px;padding:6px 14px;border-radius:10px;">View the airport map</a></div>
        </td></tr>`
      : '';
    const cash = copy.showCash ? cashNote(r) : null;
    const buttonUrl = copy.button.to === 'site' ? this.siteUrl() : this.reservationUrl(r.code);

    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy.heading)} · ${esc(r.code)}</title></head>
<body style="margin:0;background:${CREAM};font-family:Arial,Helvetica,sans-serif;color:${NAVY};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CREAM};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
        <tr><td style="padding-bottom:16px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle"><img src="${esc(this.siteUrl())}/email/logo.png" width="120" height="51" alt="${esc(company.name)}" style="display:block;border:0;"></td>
            <td valign="middle" style="padding-left:12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:700;color:${NAVY};">${esc(company.name)}</td>
          </tr></table>
        </td></tr>

        <tr><td style="background:${copy.banner};border-radius:16px;padding:16px 20px;color:#ffffff;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="48" style="padding-right:12px;">
              <div style="width:36px;height:36px;line-height:36px;border-radius:18px;background:${copy.circle};color:#ffffff;text-align:center;font-size:18px;">${copy.icon}</div>
            </td>
            <td valign="top">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;">${esc(copy.heading)}</div>
              <div style="font-size:14px;color:#f3f3f3;margin-top:4px;">${esc(copy.intro(r.customer.firstName.trim()))}</div>
              <div style="font-size:11px;color:#f3f3f3;margin-top:12px;">Reservation code</div>
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:700;letter-spacing:3px;">${esc(r.code)}</div>
            </td>
          </tr></table>
        </td></tr>
        ${spacer}
        <tr><td style="${card}padding:16px 20px;font-size:14px;line-height:1.5;color:${NAVY};">${esc(copy.note)}</td></tr>
        ${spacer}
        ${cash ? `<tr><td style="background:${SAND};border-radius:12px;padding:12px 16px;font-size:14px;font-weight:600;color:${NAVY};">${esc(cash)}</td></tr>${spacer}` : ''}

        ${legs}

        <tr><td style="${card}padding:20px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="top" width="33%"><div style="${label}">Vehicle</div><div style="${value}">${esc(r.vehicleName)}</div></td>
            <td valign="top" width="33%"><div style="${label}">Passengers</div><div style="${value}">${r.passengers}</div></td>
            <td valign="top"><div style="${label}">${totalLabel(r, kind)}</div><div style="${value}">${usd(r.total)} USD</div></td>
          </tr></table>
          <div style="${label}margin-top:14px;">Lead passenger</div>
          <div style="${value}">${esc(leadPassenger(r))}</div>
          ${r.specialRequests ? `<div style="${label}margin-top:14px;">Special requests</div><div style="font-size:14px;color:${NAVY};margin-top:2px;white-space:pre-line;">${esc(r.specialRequests)}</div>` : ''}
        </td></tr>
        ${guideBlock}
        ${contactBlock}

        <tr><td align="center" style="padding-top:24px;">
          <a href="${esc(buttonUrl)}" style="display:inline-block;background:${BLUE};color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 24px;border-radius:12px;">${esc(copy.button.label)}</a>
        </td></tr>
        <tr><td align="center" style="padding-top:20px;font-size:12px;color:${MUTED};">${esc(company.name)} · Cancun &amp; Riviera Maya</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  }
}

const STATUS_ES: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No se presentó',
};
const PAYMENT_ES: Record<string, string> = {
  UNPAID: 'Sin pagar',
  PAID: 'Pagada',
  PARTIALLY_REFUNDED: 'Reembolso parcial',
  REFUNDED: 'Reembolsada',
  FAILED: 'Pago fallido',
};

function legLabelEs(r: ReservationSummary, legNumber: number): string {
  if (r.legs.length === 1) return 'Servicio';
  return legNumber === 1 ? 'Ida' : 'Regreso';
}

function legLabel(r: ReservationSummary, legNumber: number): string {
  if (r.legs.length === 1) return 'Your transfer';
  return legNumber === 1 ? 'Outbound' : 'Return';
}

function flightLine(leg: ReservationSummary['legs'][number]): string {
  const parts = [`${leg.airline ?? ''} ${leg.flightNumber ?? ''}`.trim()];
  if (leg.flightTime) {
    // Mismo día que la recogida: solo la hora, como en la página.
    parts.push(leg.flightTime.slice(0, 10) === leg.pickupAt.slice(0, 10) ? formatLocalTime(leg.flightTime) : formatLocal(leg.flightTime));
  }
  if (leg.terminal) parts.push(`Terminal ${leg.terminal.slice(1)}`);
  return parts.join(' · ');
}

function usd(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

const METHOD_LABEL = { STRIPE: 'Credit card (Stripe)', PAYPAL: 'PayPal', CASH: 'Cash', TRANSFER: 'Bank transfer' } as const;

function totalLabel(r: ReservationSummary, kind: EmailKind): string {
  // En el correo de servicio completado solo va "Price" y la cantidad.
  if (kind === 'RESERVATION_COMPLETED') return 'Price';
  if (r.paymentStatus === 'PAID') return r.paymentMethod ? `Paid · ${METHOD_LABEL[r.paymentMethod]}` : 'Paid';
  return r.payInCash ? 'Due in cash' : 'Total';
}

function cashNote(r: ReservationSummary): string | null {
  if (r.paymentStatus === 'PAID' || !r.payInCash) return null;
  return `Please pay ${usd(r.total)} USD in cash to your driver after the service.`;
}

function leadPassenger(r: ReservationSummary): string {
  const name = `${r.customer.firstName} ${r.customer.lastName}`;
  if (!r.customer.phone) return name;
  const phone = parsePhoneNumberFromString(r.customer.phone)?.formatInternational() ?? r.customer.phone;
  return `${name} · ${phone}`;
}

/** [título, texto, enlace] de cada dato de contacto capturado en Configuración → Empresa. */
function contactLines(company: CompanySettings): [string, string, string | null][] {
  const lines: [string, string, string | null][] = [];
  if (company.phone) lines.push(['Phone', company.phone, `tel:${company.phone.replace(/[^+\d]/g, '')}`]);
  if (company.email) lines.push(['Email', company.email, `mailto:${company.email}`]);
  if (company.hours) lines.push(['Office hours', company.hours, null]);
  return lines;
}

/**
 * Enlace de WhatsApp para pedir ayuda con esta reservación: abre el chat con el mensaje ya escrito
 * (incluye el código y el nombre del cliente). Usa el teléfono de contacto de Configuración → Empresa (si cambia
 * ahí, cambia aquí); el campo WhatsApp solo sirve de respaldo cuando no hay teléfono.
 */
function whatsappHelpUrl(r: ReservationSummary, company: CompanySettings): string | null {
  const digits = (company.phone || company.whatsapp).replace(/\D/g, '');
  if (!digits) return null;
  // Un número de 10 dígitos es mexicano sin lada de país.
  const number = digits.length === 10 ? `52${digits}` : digits;
  const name = `${r.customer.firstName.trim()} ${r.customer.lastName.trim()}`;
  const text = `Hi ${company.name}! I need help with my service. Reservation code: ${r.code}. Name: ${name}.`;
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

const DATE_TIME = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'UTC',
});
const TIME = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });

/** 'YYYY-MM-DDTHH:MM' (hora local de Cancún) → "Tue, Oct 20, 2026, 11:05 AM". */
function formatLocal(value: string): string {
  return DATE_TIME.format(new Date(`${value}:00Z`));
}

const DATE_TIME_CANCUN = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/Cancun',
});

/** Instante ISO (UTC) → fecha y hora de Cancún, para saber cuándo se hizo la reserva. */
function formatInstantCancun(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : DATE_TIME_CANCUN.format(date);
}

/** 'YYYY-MM-DDTHH:MM' → "11:05 AM". */
function formatLocalTime(value: string): string {
  return TIME.format(new Date(`${value}:00Z`));
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
