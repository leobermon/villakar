import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { AdminCatalogModule } from './modules/admin-catalog/admin-catalog.module';
import { AdminMessagesModule } from './modules/admin-messages/admin-messages.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { AdminOrdersModule } from './modules/admin-orders/admin-orders.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactRequestsModule } from './modules/contact-requests/contact-requests.module';
import { PlacesModule } from './modules/places/places.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { SettingsModule } from './modules/settings/settings.module';
import { VehicleTypesModule } from './modules/vehicle-types/vehicle-types.module';
import { ZonesModule } from './modules/zones/zones.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // Límite global: 60 peticiones por minuto por IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    AuthModule,
    SettingsModule,
    AdminCatalogModule,
    AdminOrdersModule,
    AdminMessagesModule,
    AdminUsersModule,
    PlacesModule,
    ZonesModule,
    PricingModule,
    ContactRequestsModule,
    ReservationsModule,
    PaymentsModule,
    VehicleTypesModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
