import { Module } from '@nestjs/common';
import { PlacesModule } from '../places/places.module';
import { ZonesModule } from '../zones/zones.module';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  imports: [PlacesModule, ZonesModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
