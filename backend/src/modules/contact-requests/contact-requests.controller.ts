import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ContactRequestsService } from './contact-requests.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';

@Controller('contact-requests')
export class ContactRequestsController {
  constructor(private readonly contactRequests: ContactRequestsService) {}

  /** Formulario "Contact us" para hoteles fuera de zona o sin tarifa. */
  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  create(@Body() dto: CreateContactRequestDto): Promise<{ id: number }> {
    return this.contactRequests.create(dto);
  }
}
