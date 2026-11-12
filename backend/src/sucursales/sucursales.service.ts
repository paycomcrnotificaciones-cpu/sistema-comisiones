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

// Sucursales: puntos de venta de la empresa.
// Se pueden crear y editar libremente; borrar solo si no tienen nada asociado.

// Campos que se devuelven siempre, con los conteos para saber cuánto depende
// de cada sucursal antes de intentar borrarla.
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

  // Lista las sucursales de la empresa con cuántos comisionistas, ventas
  // y reglas tiene cada una.
  listar(empresaId: string) {
    return this.prisma.sucursal.findMany({
      where: { empresaId },
      select: seleccion,
      orderBy: { nombre: 'asc' },
    });
  }

  // Crea una sucursal. El lugar (dirección o referencia) es opcional.
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

  // Edita el nombre o el lugar de una sucursal existente.
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

  // Borra una sucursal solo si está vacía. Si tiene comisionistas, ventas o
  // reglas se rechaza con un mensaje que dice qué hay que reasignar primero,
  // para no dejar registros apuntando a algo que ya no existe.
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
