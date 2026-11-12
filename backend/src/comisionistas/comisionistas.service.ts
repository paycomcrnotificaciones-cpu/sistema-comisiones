import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { hash } from 'bcryptjs';

import type {
  ComisionistaCreateInput,
  ComisionistaUpdateInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

const incluir = {
  sucursal: { select: { id: true, nombre: true } },
  usuario: { select: { email: true, activo: true } },
} as const;

// Comisionistas: personas que venden y ganan comisión.
// Cada uno pertenece a una sucursal y puede tener (o no) un usuario para
// entrar al sistema.
@Injectable()
export class ComisionistasService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista los comisionistas de la empresa con su sucursal y su usuario.
  // Si llega soloId, devuelve únicamente ese (lo usa el propio comisionista).
  listar(empresaId: string, soloId?: string | null) {
    return this.prisma.comisionista.findMany({
      where: {
        empresaId,
        ...(soloId ? { id: soloId } : {}),
      },
      include: incluir,
      orderBy: { nombre: 'asc' },
    });
  }

  // Trae un comisionista con todos sus datos para la pantalla de perfil.
  async obtener(empresaId: string, id: string) {
    const comisionista = await this.prisma.comisionista.findFirst({
      where: { id, empresaId },
      include: incluir,
    });
    if (!comisionista) {
      throw new NotFoundException('Comisionista no encontrado');
    }
    return comisionista;
  }

  // Crea el comisionista y, si viene correo y contraseña, también su usuario
  // de acceso con rol COMISIONISTA. Las dos cosas se guardan juntas.
  async crear(empresaId: string, data: ComisionistaCreateInput) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id: data.sucursalId, empresaId },
    });
    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    const passwordHash = data.password ? await hash(data.password, 10) : null;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const comisionista = await tx.comisionista.create({
          data: {
            empresaId,
            sucursalId: data.sucursalId,
            nombre: data.nombre,
            codigo: data.codigo ?? null,
          },
        });

        if (data.email && passwordHash) {
          await tx.usuario.create({
            data: {
              empresaId,
              email: data.email,
              passwordHash,
              rol: 'COMISIONISTA',
              comisionistaId: comisionista.id,
            },
          });
        }

        return tx.comisionista.findUniqueOrThrow({
          where: { id: comisionista.id },
          include: incluir,
        });
      });
    } catch (error) {
      this.manejarConflicto(error);
      throw error;
    }
  }

  // Edita los datos del comisionista y, si se indica, su correo o contraseña.
  // Nunca deja que un comisionista quede con datos de otra empresa.
  async actualizar(
    empresaId: string,
    id: string,
    data: ComisionistaUpdateInput,
  ) {
    const actual = await this.prisma.comisionista.findFirst({
      where: { id, empresaId },
      include: { usuario: true },
    });
    if (!actual) {
      throw new NotFoundException('Comisionista no encontrado');
    }

    if (data.sucursalId) {
      const sucursal = await this.prisma.sucursal.findFirst({
        where: { id: data.sucursalId, empresaId },
      });
      if (!sucursal) {
        throw new NotFoundException('Sucursal no encontrada');
      }
    }

    const passwordHash = data.password
      ? await hash(data.password, 10)
      : undefined;

    if (!actual.usuario && data.password && !data.email) {
      throw new BadRequestException(
        'Indica el email para crear el acceso del comisionista',
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.comisionista.update({
          where: { id },
          data: {
            ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
            ...(data.codigo !== undefined
              ? { codigo: data.codigo ?? null }
              : {}),
            ...(data.sucursalId !== undefined
              ? { sucursalId: data.sucursalId }
              : {}),
            ...(data.activo !== undefined ? { activo: data.activo } : {}),
          },
        });

        const tocaAcceso =
          data.email !== undefined ||
          passwordHash !== undefined ||
          data.activo !== undefined;

        if (tocaAcceso) {
          if (actual.usuario) {
            await tx.usuario.update({
              where: { id: actual.usuario.id },
              data: {
                ...(data.email !== undefined ? { email: data.email } : {}),
                ...(passwordHash ? { passwordHash } : {}),
                ...(data.activo !== undefined
                  ? { activo: data.activo }
                  : {}),
              },
            });
          } else if (data.email && passwordHash) {
            await tx.usuario.create({
              data: {
                empresaId,
                email: data.email,
                passwordHash,
                rol: 'COMISIONISTA',
                comisionistaId: id,
                activo: data.activo ?? true,
              },
            });
          } else if (data.email || passwordHash) {
            throw new BadRequestException(
              'Indica email y contraseña para crear el acceso',
            );
          }
        }

        return tx.comisionista.findUniqueOrThrow({
          where: { id },
          include: incluir,
        });
      });
    } catch (error) {
      this.manejarConflicto(error);
      throw error;
    }
  }

  // Traduce el error de "dato repetido" de la base a un mensaje entendible.
  private manejarConflicto(error: unknown): void {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        'Ya existe un comisionista con ese código o el email ya está registrado',
      );
    }
  }
}
