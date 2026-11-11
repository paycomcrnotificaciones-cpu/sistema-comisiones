import {
  BadRequestException,
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
  lugar: true,
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

  crear(empresaId: string, data: SucursalCreateInput) {
    return this.prisma.sucursal.create({
      data: {
        empresaId,
        nombre: data.nombre,
        lugar: data.lugar?.trim() || null,
      },
      select: seleccion,
    });
  }

  async actualizar(empresaId: string, id: string, data: SucursalUpdateInput) {
    const actual = await this.prisma.sucursal.findFirst({
      where: { id, empresaId },
      select: { id: true },
    });
    if (!actual) throw new NotFoundException('Sucursal no encontrada');

    return this.prisma.sucursal.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.lugar !== undefined
          ? { lugar: data.lugar?.trim() || null }
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
}
