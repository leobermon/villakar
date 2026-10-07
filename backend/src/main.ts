import { ValidationPipe } from '@nestjs/common';
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
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();

  await app.listen(config.getOrThrow<number>('PORT'));
}

void bootstrap();
