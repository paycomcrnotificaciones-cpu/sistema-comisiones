import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { CatalogoInput, CatalogoUpdateInput } from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Catálogo de productos o servicios. Es la lista de la que se elige
// al registrar una venta o una suscripción.
@Injectable()
export class CatalogosService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista el catálogo de la empresa; si piden solo activos, filtra.
  listar(empresaId: string, soloActivos = false) {
    return this.prisma.catalogo.findMany({
      where: { empresaId, ...(soloActivos ? { activo: true } : {}) },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });
  }

  // Crea un producto. El nombre no se puede repetir en la misma empresa.
  async crear(empresaId: string, data: CatalogoInput) {
    const repetido = await this.prisma.catalogo.findFirst({
      where: { empresaId, nombre: { equals: data.nombre, mode: 'insensitive' } },
    });
    if (repetido) {
      throw new ConflictException('Ya existe un producto con ese nombre');
    }
    return this.prisma.catalogo.create({
      data: { empresaId, nombre: data.nombre, activo: data.activo },
    });
  }

  async actualizar(empresaId: string, id: string, data: CatalogoUpdateInput) {
    const actual = await this.prisma.catalogo.findFirst({
      where: { id, empresaId },
    });
    if (!actual) throw new NotFoundException('Producto no encontrado');

    if (data.nombre && data.nombre.toLowerCase() !== actual.nombre.toLowerCase()) {
      const repetido = await this.prisma.catalogo.findFirst({
        where: {
          empresaId,
          nombre: { equals: data.nombre, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (repetido) {
        throw new ConflictException('Ya existe un producto con ese nombre');
      }
    }

    return this.prisma.catalogo.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined ? { nombre: data.nombre } : {}),
        ...(data.activo !== undefined ? { activo: data.activo } : {}),
      },
    });
  }

  // Borrar el producto no borra las ventas: solo se pierde el vínculo.
  async eliminar(empresaId: string, id: string) {
    const actual = await this.prisma.catalogo.findFirst({
      where: { id, empresaId },
    });
    if (!actual) throw new NotFoundException('Producto no encontrado');
    await this.prisma.catalogo.delete({ where: { id } });
    return { eliminado: true };
  }
}
