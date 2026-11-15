import { Body, Controller, Get, Headers, HttpCode, Ip, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminAuthGuard } from '../auth/admin-auth.guard';
import { AnalyticsService } from './analytics.service';
import { TrackEventDto } from './dto/track-event.dto';

@Controller()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  /** El sitio de reservas avisa lo que hace el visitante. Responde 204: nunca estorba al cliente. */
  @Post('vk')
  @HttpCode(204)
  @Throttle({ default: { ttl: 60_000, limit: 120 } })
  async track(@Body() dto: TrackEventDto, @Headers('user-agent') userAgent?: string, @Ip() ip?: string): Promise<void> {
    await this.analytics.record(dto, userAgent, ip);
  }

  /** Estadísticas para el panel (cualquier usuario con sesión). */
  @Get('admin/site-stats')
  @UseGuards(AdminAuthGuard)
  stats(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analytics.stats(from, to);
  }
}
