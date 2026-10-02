import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { SECTION_DTO } from './dto';
import { ProviderStatus, SETTINGS_SECTIONS, Settings, SettingsSection } from './settings.types';

/**
 * Configuración del negocio guardada en app_settings. Mientras una sección no
 * se haya guardado desde el panel, valen los valores del .env (y de ahí los
 * valores por defecto). Se cachea en memoria: este proceso es el único que la
 * escribe.
 */
@Injectable()
export class SettingsService {
  private cache: Settings | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getAll(): Promise<Settings> {
    if (this.cache) return this.cache;
    const defaults = this.defaults();
    const rows = await this.prisma.appSetting.findMany();
    const settings: Settings = { ...defaults };
    for (const row of rows) {
      const section = row.key as SettingsSection;
      if (!SETTINGS_SECTIONS.includes(section) || !isObject(row.value)) continue;
      // Se combinan con los valores por defecto: un campo nuevo no rompe filas viejas.
      (settings as Record<SettingsSection, object>)[section] = { ...defaults[section], ...row.value };
    }
    this.cache = settings;
    return settings;
  }

  async get<S extends SettingsSection>(section: S): Promise<Settings[S]> {
    return (await this.getAll())[section];
  }

  /** Valida y guarda una sección completa. Devuelve la sección guardada. */
  async save<S extends SettingsSection>(section: S, body: unknown, userId: number): Promise<Settings[S]> {
    const values = await validated(section, body);

    if (section === 'payments') {
      const payments = values as Settings['payments'];
      const providers = this.providers();
      const working =
        (payments.cardEnabled && providers.stripe.connected) ||
        (payments.paypalEnabled && providers.paypal.connected) ||
        payments.cashEnabled;
      if (!working) {
        throw new BadRequestException('Debe quedar al menos un método de pago funcionando; si no, nadie podrá reservar en línea.');
      }
    }
    if (section === 'notifications') {
      const notifications = values as Settings['notifications'];
      notifications.teamEmails = [...new Set(notifications.teamEmails.map((email) => email.trim().toLowerCase()))];
      const wantsAlerts =
        notifications.notifyNewReservation || notifications.notifyContactRequest || notifications.notifyPaymentToVerify;
      if (wantsAlerts && notifications.teamEmails.length === 0) {
        throw new BadRequestException('Agrega al menos un correo del equipo para recibir los avisos.');
      }
    }

    const value = values as unknown as Prisma.InputJsonObject;
    await this.prisma.appSetting.upsert({
      where: { key: section },
      create: { key: section, value, updatedBy: userId },
      update: { value, updatedBy: userId },
    });
    this.cache = null;
    return this.get(section);
  }

  /** Si Stripe y PayPal tienen claves en el servidor, y si son de prueba o reales. */
  providers(): Record<'stripe' | 'paypal', ProviderStatus> {
    const stripeKey = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    const paypalReady = Boolean(this.config.get<string>('PAYPAL_CLIENT_ID') && this.config.get<string>('PAYPAL_CLIENT_SECRET'));
    return {
      stripe: stripeKey
        ? { connected: true, mode: /^(sk|rk)_live_/.test(stripeKey) ? 'live' : 'test' }
        : { connected: false, mode: null },
      paypal: paypalReady
        ? { connected: true, mode: this.config.get<string>('PAYPAL_ENV') === 'live' ? 'live' : 'test' }
        : { connected: false, mode: null },
    };
  }

  /** Lo que el sistema usaba antes de existir esta tabla (.env y valores fijos del sitio). */
  private defaults(): Settings {
    const sender = parseMailFrom(this.config.get<string>('MAIL_FROM') ?? '');
    return {
      company: { name: 'VillaKar Transfers', phone: '', whatsapp: '', email: '', address: '' },
      booking: {
        minNoticeHours: this.config.getOrThrow<number>('BOOKING_MIN_NOTICE_HOURS'),
        holdMinutes: this.config.getOrThrow<number>('BOOKING_HOLD_MINUTES'),
        maxOnlinePassengers: 7,
        departurePickupLeadHours: 3,
        roundTripFactor: 1.85,
      },
      payments: {
        cardEnabled: true,
        paypalEnabled: true,
        cashEnabled: this.config.getOrThrow<boolean>('CASH_PAYMENTS_ENABLED'),
      },
      notifications: {
        senderName: sender.name || 'VillaKar Transfers',
        senderEmail: sender.email || 'no-reply@villakar.test',
        teamEmails: [],
        notifyNewReservation: true,
        notifyContactRequest: true,
        notifyPaymentToVerify: true,
        paymentLinkLanguage: 'en',
      },
    };
  }
}

/** Valida el cuerpo con el DTO de la sección; el primer error va tal cual al panel. */
async function validated<S extends SettingsSection>(section: S, body: unknown): Promise<Settings[S]> {
  if (!SETTINGS_SECTIONS.includes(section)) throw new BadRequestException('Sección desconocida.');
  if (!isObject(body)) throw new BadRequestException('Datos no válidos.');
  const instance = plainToInstance(SECTION_DTO[section] as new () => object, body);
  const errors = await validate(instance, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length > 0) {
    const first = errors[0]!;
    const message = first.constraints ? Object.values(first.constraints)[0] : undefined;
    throw new BadRequestException(message ?? `Revisa el campo ${first.property}.`);
  }
  return { ...instance } as Settings[S];
}

/** '"Nombre" <correo>', 'Nombre <correo>' o solo 'correo'. */
function parseMailFrom(value: string): { name: string; email: string } {
  const match = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(value);
  if (match) return { name: match[1]!.trim(), email: match[2]!.trim() };
  return { name: '', email: value.trim() };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
