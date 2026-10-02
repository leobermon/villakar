import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { dummyPasswordHash, verifyPassword } from './password';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface SessionPayload {
  sub: number;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Mismo error si el email no existe, la contraseña no coincide o el usuario está desactivado. */
  async login(email: string, password: string): Promise<{ user: AdminUser; token: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    const valid = await verifyPassword(password, user?.passwordHash ?? (await dummyPasswordHash()));
    if (!user || !valid || !user.isActive) throw new UnauthorizedException('Correo o contraseña incorrectos.');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const payload: SessionPayload = { sub: Number(user.id), role: user.role };
    const token = await this.jwt.signAsync(payload, { expiresIn: `${this.sessionHours()}h` });
    return { user: toAdminUser(user), token };
  }

  /** Valida la sesión y relee el usuario (si lo desactivan, pierde acceso de inmediato). */
  async userFromToken(token: string): Promise<AdminUser | null> {
    let payload: SessionPayload;
    try {
      payload = await this.jwt.verifyAsync<SessionPayload>(token);
    } catch {
      return null;
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    return user?.isActive ? toAdminUser(user) : null;
  }

  sessionHours(): number {
    return this.config.getOrThrow<number>('ADMIN_SESSION_HOURS');
  }
}

function toAdminUser(user: { id: bigint; name: string; email: string; role: UserRole }): AdminUser {
  return { id: Number(user.id), name: user.name, email: user.email, role: user.role };
}
