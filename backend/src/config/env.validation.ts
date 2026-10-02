import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, MinLength, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  @IsString()
  @IsNotEmpty()
  GOOGLE_MAPS_SERVER_KEY: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS: string = 'http://localhost:5173,http://localhost:5174';

  @IsInt()
  @Min(1)
  @Max(30)
  PLACES_CACHE_DAYS: number = 30;

  /** URL pública del sitio de reservas: a ella regresan Stripe y PayPal tras el pago. */
  @IsUrl({ require_tld: false })
  PUBLIC_SITE_URL: string = 'http://localhost:5173';

  /** Horas mínimas de anticipación para reservar en línea. */
  @IsInt()
  @Min(0)
  @Max(168)
  BOOKING_MIN_NOTICE_HOURS: number = 12;

  /** Minutos que una reserva sin pagar conserva su precio antes de expirar. */
  @IsInt()
  @Min(30)
  @Max(1440)
  BOOKING_HOLD_MINUTES: number = 60;

  // Pagos: opcionales para poder arrancar sin ellos; el método de pago que no
  // esté configurado responde 503 y el sitio lo oculta.
  @IsOptional()
  @IsString()
  STRIPE_SECRET_KEY?: string;

  @IsOptional()
  @IsString()
  STRIPE_WEBHOOK_SECRET?: string;

  @IsOptional()
  @IsString()
  PAYPAL_CLIENT_ID?: string;

  @IsOptional()
  @IsString()
  PAYPAL_CLIENT_SECRET?: string;

  @IsIn(['sandbox', 'live'])
  PAYPAL_ENV: 'sandbox' | 'live' = 'sandbox';

  /** Permite reservar y pagar en efectivo al chofer después del servicio. */
  // Sin la variable queda activado; con ella, solo 'true' lo activa.
  @Transform(({ obj, key }) => envFlag(obj[key], true))
  @IsBoolean()
  CASH_PAYMENTS_ENABLED: boolean = true;

  // Correo saliente (SMTP). Vacío = correos desactivados. En desarrollo: Mailpit.
  @IsOptional()
  @IsString()
  SMTP_HOST?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT: number = 1025;

  /** true para TLS directo (puerto 465); false para STARTTLS o sin cifrar (587 / 1025). */
  @Transform(({ obj, key }) => envFlag(obj[key], false))
  @IsBoolean()
  SMTP_SECURE: boolean = false;

  @IsOptional()
  @IsString()
  SMTP_USER?: string;

  @IsOptional()
  @IsString()
  SMTP_PASS?: string;

  // Panel de administración.
  /** Secreto para firmar la sesión del panel (mínimo 32 caracteres aleatorios). */
  @IsString()
  @MinLength(32)
  ADMIN_JWT_SECRET: string;

  /** Horas que dura una sesión del panel. */
  @IsInt()
  @Min(1)
  @Max(72)
  ADMIN_SESSION_HOURS: number = 12;

  /** true en producción (https): la cookie de sesión solo viaja cifrada. */
  @Transform(({ obj, key }) => envFlag(obj[key], false))
  @IsBoolean()
  COOKIE_SECURE: boolean = false;

  /** Remitente de los correos, p. ej. "VillaKar Transfers <reservations@tudominio.com>". */
  @IsString()
  @IsNotEmpty()
  MAIL_FROM: string = 'VillaKar Transfers <no-reply@villakar.test>';
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errors.map((e) => e.toString()).join('\n')}`);
  }
  return validated;
}

/**
 * Lee una variable booleana desde el texto original del .env. Se usa `obj[key]`
 * y no `value` porque la conversión implícita convierte "false" en true.
 */
function envFlag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined || raw === '') return fallback;
  return raw === true || String(raw).trim().toLowerCase() === 'true';
}
