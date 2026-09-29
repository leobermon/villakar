import { Controller, Get, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AutocompleteQueryDto } from './dto/autocomplete-query.dto';
import { PlacesService, PlaceSuggestion } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  /** Buscador de hoteles (proxy a Google Places para no exponer la clave). */
  @Get('autocomplete')
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  autocomplete(@Query() query: AutocompleteQueryDto): Promise<PlaceSuggestion[]> {
    return this.places.autocomplete(query.input, query.sessionToken);
  }
}
