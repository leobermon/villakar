import { Injectable } from '@nestjs/common';
import { dateOnlyToDate } from '../../common/utils/time';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';

@Injectable()
export class ContactRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateContactRequestDto): Promise<{ id: number }> {
    const request = await this.prisma.contactRequest.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        hotelName: dto.hotelName,
        googlePlaceId: dto.googlePlaceId,
        arrivalDate: dto.arrivalDate ? dateOnlyToDate(dto.arrivalDate) : undefined,
        passengers: dto.passengers,
        message: dto.message,
      },
      select: { id: true },
    });
    // TODO(notificaciones): avisar por email al equipo cuando exista el módulo de notificaciones.
    return { id: Number(request.id) };
  }
}
