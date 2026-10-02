import { Global, Module } from '@nestjs/common';
import { PublicSettingsController, SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

/** Global: reservas, pagos y correos leen la configuración vigente. */
@Global()
@Module({
  controllers: [SettingsController, PublicSettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
