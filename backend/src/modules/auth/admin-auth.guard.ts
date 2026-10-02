import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { AdminUser, AuthService } from './auth.service';

/** Nombre de la cookie de sesión del panel. */
export const SESSION_COOKIE = 'vk_admin';

const ROLES_KEY = 'adminRoles';
/** Restringe una ruta a ciertos roles (SUPER_ADMIN siempre pasa). Sin @Roles basta con estar logueado. */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

type AdminRequest = Request & { adminUser?: AdminUser };

/** El usuario del panel que hace la petición (en rutas protegidas por AdminAuthGuard). */
export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  return context.switchToHttp().getRequest<AdminRequest>().adminUser;
});

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminRequest>();
    const token = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE];
    const user = token ? await this.auth.userFromToken(token) : null;
    if (!user) throw new UnauthorizedException('Inicia sesión para continuar.');

    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (roles?.length && user.role !== UserRole.SUPER_ADMIN && !roles.includes(user.role)) {
      throw new ForbiddenException('Tu usuario no tiene permiso para esta acción.');
    }
    request.adminUser = user;
    return true;
  }
}
