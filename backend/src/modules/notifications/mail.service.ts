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

  constructor(
    config: ConfigService,
    private readonly settings: SettingsService,
  ) {
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
    if (!this.transporter) return false;
    try {
      // Remitente vigente de Configuración → Notificaciones (por defecto, MAIL_FROM del .env).
      const { senderName, senderEmail } = await this.settings.get('notifications');
      await this.transporter.sendMail({ from: { name: senderName, address: senderEmail }, ...mail });
      return true;
    } catch (error) {
      this.logger.error(`Could not send "${mail.subject}": ${String(error)}`);
      return false;
    }
  }
}
