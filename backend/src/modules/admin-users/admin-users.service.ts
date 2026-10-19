import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminUser } from '../auth/auth.service';
import { hashPassword } from '../auth/password';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto';

/** Usuario del panel tal como lo ve el administrador (nunca incluye la contraseña). */
export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

type UserRow = Prisma.UserGetPayload<object>;

function toManaged(row: UserRow): ManagedUser {
  return {
    id: Number(row.id),
    name: row.name,
    email: row.email,
    role: row.role,
    isActive: row.isActive,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Alta y edición de los usuarios que entran al panel. Por ahora el rol solo se guarda y se
 * muestra: las reglas de qué puede hacer cada rol se definen más adelante. Las únicas
 * protecciones son las que evitan quedarse sin acceso o escalar privilegios.
 */
@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(): Promise<ManagedUser[]> {
    const rows = await this.prisma.user.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
    return rows.map(toManaged);
  }

  async create(dto: CreateAdminUserDto, actor: AdminUser): Promise<ManagedUser> {
    this.assertCanAssign(dto.role, actor);
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }
    const row = await this.prisma.user.create({
      data: { name: dto.name.trim(), email, role: dto.role, passwordHash: await hashPassword(dto.password) },
    });
    return toManaged(row);
  }

  async update(id: number, dto: UpdateAdminUserDto, actor: AdminUser): Promise<ManagedUser> {
    const target = await this.prisma.user.findUnique({ where: { id: BigInt(id) } });
    if (!target) throw new NotFoundException('El usuario no existe.');
    const isSelf = Number(target.id) === actor.id;

    // Solo un superadministrador toca a otro superadministrador o crea uno.
    if (target.role === UserRole.SUPER_ADMIN) this.assertCanAssign(UserRole.SUPER_ADMIN, actor);
    if (dto.role !== undefined) this.assertCanAssign(dto.role, actor);

    // No dejar el panel sin acceso: nadie se quita su propio acceso y siempre queda un superadministrador activo.
    if (isSelf && dto.isActive === false) throw new BadRequestException('No puedes desactivar tu propio usuario.');
    if (isSelf && dto.role !== undefined && dto.role !== target.role) throw new BadRequestException('No puedes cambiar tu propio rol.');
    const changesRole = dto.role !== undefined && dto.role !== UserRole.SUPER_ADMIN;
    const losesSuper = target.role === UserRole.SUPER_ADMIN && target.isActive && (changesRole || dto.isActive === false);
    if (losesSuper) {
      const otherSupers = await this.prisma.user.count({
        where: { role: UserRole.SUPER_ADMIN, isActive: true, id: { not: target.id } },
      });
      if (otherSupers === 0) throw new BadRequestException('Debe quedar al menos un superadministrador activo.');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) data.passwordHash = await hashPassword(dto.password);
    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      if (email !== target.email) {
        if (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) {
          throw new ConflictException('Ya existe un usuario con ese correo.');
        }
        data.email = email;
      }
    }
    const row = await this.prisma.user.update({ where: { id: target.id }, data });
    return toManaged(row);
  }

  private assertCanAssign(role: UserRole, actor: AdminUser): void {
    if (role === UserRole.SUPER_ADMIN && actor.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Solo un superadministrador puede asignar o modificar ese rol.');
    }
  }
}
