import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { SettingsService } from '../settings/settings.service';

export interface OutgoingMail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envío de correo por SMTP. En desarrollo apunta a Mailpit (docker compose),
 * que atrapa los correos sin enviarlos a internet; en producción, al SMTP del
 * proveedor (Gmail, Resend, SES…) configurado en las variables SMTP_*.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  /** Direcciones que reciben una copia oculta de cada correo (MAIL_COPY_TO), para controlar lo que se envía. */
  private readonly copyTo: string[];

  constructor(
    config: ConfigService,
    private readonly settings: SettingsService,
  ) {
    this.copyTo = (config.get<string>('MAIL_COPY_TO') ?? '')
      .split(',')
      .map((address) => address.trim())
      .filter(Boolean);
    if (this.copyTo.length) this.logger.log(`Copia oculta de todos los correos a: ${this.copyTo.join(', ')}`);
    const host = config.get<string>('SMTP_HOST');
    const user = config.get<string>('SMTP_USER');
    this.transporter = host
      ? createTransport({
          host,
          port: config.getOrThrow<number>('SMTP_PORT'),
          secure: config.getOrThrow<boolean>('SMTP_SECURE'),
          auth: user ? { user, pass: config.get<string>('SMTP_PASS') } : undefined,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        })
      : null;
    if (!this.transporter) this.logger.warn('SMTP_HOST is not set: emails are disabled');
  }

  /** Devuelve true si el servidor SMTP aceptó el correo. Nunca lanza. */
  async send(mail: OutgoingMail): Promise<boolean> {
    return (await this.trySend(mail)).ok;
  }

  /** Igual que send, pero con el motivo cuando falla (para el registro de correos). Nunca lanza. */
  async trySend(mail: OutgoingMail): Promise<{ ok: true } | { ok: false; error: string }> {
    if (!this.transporter) return { ok: false, error: 'El correo está desactivado (SMTP_HOST no está configurado).' };
    try {
      // Remitente vigente de Configuración → Notificaciones (por defecto, MAIL_FROM del .env).
      const { senderName, senderEmail } = await this.settings.get('notifications');
      // Copia oculta (BCC) a quien controla los envíos; si ya es el destinatario, no se repite.
      const bcc = this.copyTo.filter((address) => address.toLowerCase() !== mail.to.toLowerCase());
      await this.transporter.sendMail({
        from: { name: senderName, address: senderEmail },
        ...mail,
        ...(bcc.length ? { bcc } : {}),
      });
      return { ok: true };
    } catch (error) {
      this.logger.error(`Could not send "${mail.subject}": ${String(error)}`);
      return { ok: false, error: String(error instanceof Error ? error.message : error).slice(0, 480) };
    }
  }
}
