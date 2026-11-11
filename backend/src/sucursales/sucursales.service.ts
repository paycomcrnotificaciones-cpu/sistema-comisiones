import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  SucursalCreateInput,
  SucursalUpdateInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

const seleccion = {
  id: true,
  nombre: true,
  codigo: true,
  creadoEn: true,
  _count: { select: { comisionistas: true, ventas: true, reglas: true } },
} as const;

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.sucursal.findMany({
      where: { empresaId },
      select: seleccion,
      orderBy: { nombre: 'asc' },
    });
  }

  async crear(empresaId: string, data: SucursalCreateInput) {
    await this.validarCodigo(empresaId, data.codigo ?? null);

    return this.prisma.sucursal.create({
      data: {
        empresaId,
        nombre: data.nombre,
        codigo: data.codigo?.trim() || null,
      },
      select: seleccion,
    });
  }

  async actualizar(empresaId: string, id: string, data: SucursalUpdateInput) {
    const actual = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
      select: { id: true, codigo: true },
    });
    if (!actual) throw new NotFoundException('Sucursal no encontrada');

    if (data.codigo !== undefined && data.codigo !== actual.codigo) {
      await this.validarCodigo(empresaId, data.codigo, id);
    }

    return this.prisma.sucursal.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.codigo !== undefined
          ? { codigo: data.codigo?.trim() || null }
          : {}),
      },
      select: seleccion,
    });
  }

  async eliminar(empresaId: string, id: string) {
    const sucursal = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
      select: {
        id: true,
        _count: { select: { comisionistas: true, ventas: true, reglas: true } },
      },
    });
    if (!sucursal) throw new NotFoundException('Sucursal no encontrada');

    const { comisionistas, ventas, reglas } = sucursal._count;
    const usos: string[] = [];
    if (comisionistas > 0) {
      usos.push(`${comisionistas} comisionista${comisionistas === 1 ? '' : 's'}`);
    }
    if (ventas > 0) usos.push(`${ventas} venta${ventas === 1 ? '' : 's'}`);
    if (reglas > 0) usos.push(`${reglas} regla${reglas === 1 ? '' : 's'}`);

    if (usos.length > 0) {
      throw new BadRequestException(
        `No se puede eliminar: tiene ${usos.join(', ')} asociados. Reasígnalos primero.`,
      );
    }

    await this.prisma.sucursal.delete({ where: { id } });
    return { eliminada: true };
  }

  private async validarCodigo(
    empresaId: string,
    codigo: string | null,
    excluirId?: string,
  ) {
    if (!codigo) return;
    const existente = await this.prisma.sucursal.findFirst({
      where: {
        empresaId,
        codigo,
        ...(excluirId ? { id: { not: excluirId } } : {}),
      },
      select: { id: true },
    });
    if (existente) {
      throw new ConflictException(`Ya existe una sucursal con el código ${codigo}`);
    }
  }
}
