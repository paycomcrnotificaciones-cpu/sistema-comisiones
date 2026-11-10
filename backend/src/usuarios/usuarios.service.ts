import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';

import type {
  UsuarioCreateInput,
  UsuarioUpdateInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

const seleccion = {
  id: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  comisionistaId: true,
  comisionista: { select: { id: true, nombre: true } },
} as const;

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: seleccion,
      orderBy: [{ rol: 'asc' }, { email: 'asc' }],
    });
  }

  async crear(
    empresaId: string,
    actor: { sub: string; rol: string },
    data: UsuarioCreateInput,
  ) {
    this.validarRolAsignable(actor.rol, data.rol);

    if (data.comisionistaId) {
      const comisionista = await this.prisma.comisionista.findFirst({
        where: { id: data.comisionistaId, empresaId },
        include: { usuario: { select: { id: true } } },
      });
      if (!comisionista) {
        throw new NotFoundException('Comisionista no encontrado');
      }
      if (comisionista.usuario) {
        throw new ConflictException(
          'Ese comisionista ya tiene un usuario de acceso',
        );
      }
    }

    try {
      return await this.prisma.usuario.create({
        data: {
          empresaId,
          email: data.email,
          passwordHash: await hash(data.password, 10),
          rol: data.rol,
          comisionistaId:
            data.rol === 'COMISIONISTA' ? data.comisionistaId : null,
        },
        select: seleccion,
      });
    } catch (error) {
      this.manejarConflicto(error);
      throw error;
    }
  }

  async actualizar(
    empresaId: string,
    actor: { sub: string; rol: string },
    id: string,
    data: UsuarioUpdateInput,
  ) {
    const actual = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      select: { ...seleccion, passwordHash: true },
    });
    if (!actual) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (actual.rol === 'SUPER_ADMIN' && actor.rol !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo un super admin puede editar a otro');
    }

    if (
      actor.rol !== 'SUPER_ADMIN' &&
      actual.rol !== 'SUPERVISOR' &&
      actual.rol !== 'COMISIONISTA'
    ) {
      throw new ForbiddenException(
        'Solo un super admin puede editar a un administrador',
      );
    }

    if (data.rol && data.rol !== actual.rol) {
      if (id === actor.sub) {
        throw new BadRequestException('No puedes cambiar tu propio rol');
      }
      this.validarRolAsignable(actor.rol, data.rol);
      if (actual.rol === 'COMISIONISTA' || data.rol === 'COMISIONISTA') {
        throw new BadRequestException(
          'El rol comisionista se gestiona desde la pantalla del comisionista',
        );
      }
    }

    if (
      actual.rol === 'SUPER_ADMIN' &&
      ((data.rol && data.rol !== 'SUPER_ADMIN') || data.activo === false)
    ) {
      await this.protegerUltimoSuperAdmin(empresaId, actual.id);
    }

    if (id === actor.sub && data.activo === false) {
      throw new BadRequestException('No puedes desactivar tu propio usuario');
    }

    const passwordHash = data.password
      ? await hash(data.password, 10)
      : undefined;

    try {
      return await this.prisma.usuario.update({
        where: { id },
        data: {
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.rol !== undefined ? { rol: data.rol } : {}),
          ...(data.activo !== undefined ? { activo: data.activo } : {}),
          ...(passwordHash ? { passwordHash } : {}),
        },
        select: seleccion,
      });
    } catch (error) {
      this.manejarConflicto(error);
      throw error;
    }
  }

  private validarRolAsignable(actorRol: string, rol: string): void {
    if (actorRol === 'SUPER_ADMIN') return;
    if (rol === 'ADMIN' || rol === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Solo un super admin puede asignar el rol de administrador',
      );
    }
  }

  private async protegerUltimoSuperAdmin(
    empresaId: string,
    exceptoId: string,
  ): Promise<void> {
    const otros = await this.prisma.usuario.count({
      where: {
        empresaId,
        rol: 'SUPER_ADMIN',
        activo: true,
        id: { not: exceptoId },
      },
    });
    if (otros === 0) {
      throw new BadRequestException(
        'Debe quedar al menos un super admin activo',
      );
    }
  }

  private manejarConflicto(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Ese correo ya está registrado');
    }
  }
}
