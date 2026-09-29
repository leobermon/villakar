import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';

// El CRUD de zonas (editor de mapa) se agrega junto con la autenticación del panel.
@Module({
  providers: [ZonesService],
  exports: [ZonesService],
})
export class ZonesModule {}
