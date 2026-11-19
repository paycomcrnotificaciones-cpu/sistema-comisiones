import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  UsuarioCreateInput,
  UsuarioUpdateInput,
} from '../common/validators.js';
import { EnlacesService } from '../auth/enlaces.service.js';
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

// Usuarios: quién puede entrar al sistema y con qué rol.
// Un usuario puede estar ligado a un comisionista (rol COMISIONISTA).
@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enlaces: EnlacesService,
  ) {}

  // Lista los usuarios de la empresa sin datos sensibles (sin contraseña).
  listar(empresaId: string) {
    return this.prisma.usuario.findMany({
      where: { empresaId },
      select: seleccion,
      orderBy: [{ rol: 'asc' }, { email: 'asc' }],
    });
  }

  // Crea un usuario. Revisa que el rol se pueda asignar y que el comisionista
  // elegido exista y no tenga ya un acceso.
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
      const usuario = await this.prisma.usuario.create({
        data: {
          empresaId,
          email: data.email,
          // Contraseña aleatoria e inservible: la persona elige la suya
          // desde el enlace de invitación.
          passwordHash: await this.enlaces.passwordProvisional(),
          rol: data.rol,
          comisionistaId:
            data.rol === 'COMISIONISTA' ? data.comisionistaId : null,
        },
        select: seleccion,
      });

      const { enlace, expiraEn } = await this.enlaces.crear(usuario.id);
      return { ...usuario, enlaceInvitacion: enlace, expiraEnlace: expiraEn };
    } catch (error) {
      this.manejarConflicto(error);
      throw error;
    }
  }

  // Genera un enlace nuevo para que el usuario cree o cambie su contraseña.
  // Sirve tanto de invitación como de recuperación.
  async generarEnlace(
    empresaId: string,
    actor: { sub: string; rol: string },
    id: string,
  ) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      select: { id: true, rol: true, activo: true },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (actor.rol !== 'SUPER_ADMIN' && usuario.rol === 'SUPER_ADMIN') {
      throw new ForbiddenException('Solo un super admin puede editar a otro');
    }
    if (!usuario.activo) {
      throw new BadRequestException('Activa el usuario antes de darle acceso');
    }

    const { enlace, expiraEn } = await this.enlaces.crear(
      usuario.id,
      'RESETEO',
    );
    return { enlace, expiraEn };
  }

  // Actualiza correo, rol o estado. La contraseña no se toca aquí:
  // solo la persona dueña de la cuenta puede cambiarla.
  // Si se desactiva o cambia de rol, protege que quede al menos un super admin.
  async actualizar(
    empresaId: string,
    actor: { sub: string; rol: string },
    id: string,
    data: UsuarioUpdateInput,
  ) {
    const actual = await this.prisma.usuario.findFirst({
      where: { id, empresaId },
      select: seleccion,
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

    try {
      return await this.prisma.usuario.update({
        where: { id },
        data: {
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.rol !== undefined ? { rol: data.rol } : {}),
          ...(data.activo !== undefined ? { activo: data.activo } : {}),
        },
        select: seleccion,
      });
    } catch (error) {
      this.manejarConflicto(error);
      throw error;
    }
  }

  // Un admin solo puede crear supervisores y comisionistas;
  // solo un super admin puede crear otros administradores.
  private validarRolAsignable(actorRol: string, rol: string): void {
    if (actorRol === 'SUPER_ADMIN') return;
    if (rol === 'ADMIN' || rol === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        'Solo un super admin puede asignar el rol de administrador',
      );
    }
  }

  // Evita que la empresa se quede sin ningún super admin activo.
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

  // Convierte el error de correo repetido en un mensaje claro.
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
