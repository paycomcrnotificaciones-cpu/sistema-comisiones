import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { ComisionistaCreateInput } from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ComisionistasService {
  constructor(private readonly prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.comisionista.findMany({
      where: { empresaId },
      include: { sucursal: { select: { id: true, nombre: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async crear(empresaId: string, data: ComisionistaCreateInput) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id: data.sucursalId, empresaId },
    });
    if (!sucursal) {
      throw new NotFoundException('Sucursal no encontrada');
    }

    try {
      return await this.prisma.comisionista.create({
        data: {
          empresaId,
          sucursalId: data.sucursalId,
          nombre: data.nombre,
          codigo: data.codigo ?? null,
        },
        include: { sucursal: { select: { id: true, nombre: true } } },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un comisionista con ese código');
      }
      throw error;
    }
  }
}
