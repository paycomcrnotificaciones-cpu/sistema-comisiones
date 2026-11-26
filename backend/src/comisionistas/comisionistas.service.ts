import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ComisionistaCreateInput,
  ComisionistaUpdateInput,
} from '../common/validators.js';
import { EnlacesService } from '../auth/enlaces.service.js';
import { CorreoService } from '../correo/correo.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const incluir = {
  usuario: { select: { email: true, activo: true } },
} as const;

// Comisionistas: personas que venden y ganan comisión.
// Cada uno puede tener (o no) un usuario para entrar al sistema.
@Injectable()
export class ComisionistasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enlaces: EnlacesService,
    private readonly correo: CorreoService,
  ) {}

  // Lista los comisionistas de la empresa con su usuario.
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

  // Crea el comisionista y, si viene correo, también su usuario de acceso
  // con rol COMISIONISTA. La persona elige su contraseña desde el enlace.
  async crear(empresaId: string, data: ComisionistaCreateInput) {
    try {
      const { creado, enlaceInvitacion, claveTemporal } =
        await this.prisma.$transaction(async (tx) => {
        const comisionista = await tx.comisionista.create({
          data: {
            empresaId,
            nombre: data.nombre,
          },
        });

        let enlaceInvitacion: string | undefined;
        let claveTemporal: string | undefined;
        if (data.email) {
          claveTemporal = this.enlaces.generarClaveTemporal();
          const acceso = await tx.usuario.create({
            data: {
              empresaId,
              email: data.email,
              // Clave temporal de 6 dígitos: debe cambiarla en 7 días.
              passwordHash: await this.enlaces.hashearClave(claveTemporal),
              debeCambiarPassword: true,
              passwordTemporalExpira: this.enlaces.vencimientoClaveTemporal(),
              rol: 'COMISIONISTA',
              comisionistaId: comisionista.id,
            },
          });
          enlaceInvitacion = (await this.enlaces.crearEnTransaccion(tx, acceso.id))
              .enlace;
        }

        const creado = await tx.comisionista.findUniqueOrThrow({
          where: { id: comisionista.id },
          include: incluir,
        });
        return { creado, enlaceInvitacion, claveTemporal };
      });

      if (data.email && enlaceInvitacion && claveTemporal) {
        const envio = await this.correo.enviarInvitacion({
          para: data.email,
          enlace: enlaceInvitacion,
          claveTemporal,
        });
        return { ...creado, enlaceInvitacion, claveTemporal, ...envio };
      }
      return { ...creado, enlaceInvitacion };
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

    try {
      const { editado, enlaceInvitacion, claveTemporal } =
        await this.prisma.$transaction(async (tx) => {
        await tx.comisionista.update({
          where: { id },
          data: {
            ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
            ...(data.activo !== undefined ? { activo: data.activo } : {}),
          },
        });

        let enlaceInvitacion: string | undefined;
        let claveTemporal: string | undefined;

        if (actual.usuario) {
          await tx.usuario.update({
            where: { id: actual.usuario.id },
            data: {
              ...(data.email !== undefined ? { email: data.email } : {}),
              ...(data.activo !== undefined ? { activo: data.activo } : {}),
            },
          });
        } else if (data.email) {
          claveTemporal = this.enlaces.generarClaveTemporal();
          const acceso = await tx.usuario.create({
            data: {
              empresaId,
              email: data.email,
              passwordHash: await this.enlaces.hashearClave(claveTemporal),
              debeCambiarPassword: true,
              passwordTemporalExpira: this.enlaces.vencimientoClaveTemporal(),
              rol: 'COMISIONISTA',
              comisionistaId: id,
              activo: data.activo ?? true,
            },
          });
          enlaceInvitacion = (await this.enlaces.crearEnTransaccion(tx, acceso.id))
              .enlace;
        }

        const editado = await tx.comisionista.findUniqueOrThrow({
          where: { id },
          include: incluir,
        });
        return { editado, enlaceInvitacion, claveTemporal };
      });

      if (data.email && enlaceInvitacion && claveTemporal) {
        const envio = await this.correo.enviarInvitacion({
          para: data.email,
          enlace: enlaceInvitacion,
          claveTemporal,
        });
        return { ...editado, enlaceInvitacion, claveTemporal, ...envio };
      }
      return { ...editado, enlaceInvitacion };
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
        'Ese correo ya está registrado en otro usuario',
      );
    }
  }
}
