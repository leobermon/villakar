import { BadRequestException, ValidationError, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

// Prisma devuelve las columnas BIGINT como bigint, que JSON.stringify no soporta.
// Los ids caben de sobra en un Number.
(BigInt.prototype as unknown as { toJSON: () => number }).toJSON = function (this: bigint) {
  return Number(this);
};

/** Nombre en lenguaje normal de los campos que el cliente llena (para los avisos de validación). */
const FIELD_LABELS: Record<string, string> = {
  firstName: 'first name',
  lastName: 'last name',
  email: 'email address',
  phone: 'phone number',
  name: 'name',
  airline: 'airline',
  flightNumber: 'flight number',
  passengers: 'number of passengers',
  hotelName: 'hotel or address',
  message: 'message',
  specialRequests: 'special requests',
};

/**
 * Mensaje de validación para el cliente. Los mensajes ya escritos a mano (empiezan con mayúscula)
 * se muestran tal cual; los automáticos ("email must be an email") se cambian por un aviso claro.
 */
function validationMessage(errors: ValidationError[]): string {
  const first = errors[0];
  if (!first) return 'Please check the information you entered.';
  if (first.children?.length) return validationMessage(first.children);
  const message = Object.values(first.constraints ?? {})[0] ?? '';
  if (/^[A-Z]/.test(message)) return message;
  const label = FIELD_LABELS[first.property];
  return label ? `Please check your ${label}.` : 'Please check the information you entered.';
}

async function bootstrap() {
  // rawBody: lo necesitarán los webhooks de Stripe para verificar la firma.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  // Detrás de Caddy: la IP real del cliente viene en X-Forwarded-For (un solo salto).
  if (config.getOrThrow<boolean>('TRUST_PROXY')) app.set('trust proxy', 1);

  app.setGlobalPrefix('api');
  // Lee la cookie de sesión del panel de administración.
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .getOrThrow<string>('CORS_ORIGINS')
      .split(',')
      .map((origin) => origin.trim()),
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException(validationMessage(errors)),
    }),
  );
  app.enableShutdownHooks();

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
