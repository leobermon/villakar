import { plainToInstance, Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

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
  @Transform(({ value }) => value === undefined || value === true || value === 'true')
  @IsBoolean()
  CASH_PAYMENTS_ENABLED: boolean = true;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, { enableImplicitConversion: true });
  const errors = validateSync(validated);
  if (errors.length > 0) {
    throw new Error(`Variables de entorno inválidas:\n${errors.map((e) => e.toString()).join('\n')}`);
  }
  return validated;
}
