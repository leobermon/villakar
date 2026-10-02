import { Body, Controller, Get, HttpCode, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { CookieOptions, Response } from 'express';
import { AdminAuthGuard, CurrentAdmin, SESSION_COOKIE } from './admin-auth.guard';
import { AdminUser, AuthService } from './auth.service';

class LoginDto {
  @IsEmail()
  @MaxLength(190)
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}

@Controller('admin/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  /** Inicia sesión: la sesión viaja en una cookie httpOnly (el JavaScript de la página no la puede leer). */
  @Post('login')
  @HttpCode(200)
  // Frena ataques de fuerza bruta: 5 intentos por minuto por IP.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response): Promise<AdminUser> {
    const { user, token } = await this.auth.login(dto.email, dto.password);
    response.cookie(SESSION_COOKIE, token, { ...this.cookieOptions(), maxAge: this.auth.sessionHours() * 3_600_000 });
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.cookieOptions());
  }

  @Get('me')
  @UseGuards(AdminAuthGuard)
  me(@CurrentAdmin() user: AdminUser): AdminUser {
    return user;
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      // Strict: el navegador no la manda desde otros sitios (protege contra CSRF).
      sameSite: 'strict',
      secure: this.config.getOrThrow<boolean>('COOKIE_SECURE'),
      path: '/api',
    };
  }
}
