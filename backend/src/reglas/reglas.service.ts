import { Injectable, NotFoundException } from '@nestjs/common';

import type {
  ReglaComisionInput,
  ReglaComisionUpdateInput,
  ReglaSugerirInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

const especificidad: Record<string, number> = {
  COMISIONISTA: 4,
  PRODUCTO: 3,
  SUCURSAL: 2,
  GLOBAL: 1,
};

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function aFecha(valor?: string | null): Date | null | undefined {
  if (valor === undefined) return undefined;
  if (valor === null) return null;
  return new Date(`${valor}T06:00:00Z`);
}

@Injectable()
export class ReglasService {
  constructor(private readonly prisma: PrismaService) {}

  listar(empresaId: string) {
    return this.prisma.reglaComision.findMany({
      where: { empresaId },
      orderBy: [{ prioridad: 'asc' }, { nombre: 'asc' }],
      include: {
        comisionista: { select: { id: true, nombre: true } },
        sucursal: { select: { id: true, nombre: true } },
      },
    });
  }

  crear(empresaId: string, input: ReglaComisionInput) {
    return this.prisma.reglaComision.create({
      data: {
        empresaId,
        nombre: input.nombre,
        tipo: input.tipo,
        valor: input.valor,
        ambito: input.ambito,
        producto: input.ambito === 'PRODUCTO' ? (input.producto ?? null) : null,
        comisionistaId:
          input.ambito === 'COMISIONISTA' ? (input.comisionistaId ?? null) : null,
        sucursalId:
          input.ambito === 'SUCURSAL' ? (input.sucursalId ?? null) : null,
        prioridad: input.prioridad,
        acumulable: input.acumulable,
        activa: input.activa,
        vigenciaDesde: aFecha(input.vigenciaDesde) ?? null,
        vigenciaHasta: aFecha(input.vigenciaHasta) ?? null,
      },
    });
  }

  async actualizar(
    empresaId: string,
    id: string,
    input: ReglaComisionUpdateInput,
  ) {
    const regla = await this.prisma.reglaComision.findFirst({
      where: { id, empresaId },
    });
    if (!regla) throw new NotFoundException('Regla no encontrada');

    return this.prisma.reglaComision.update({
      where: { id },
      data: {
        ...(input.nombre !== undefined ? { nombre: input.nombre } : {}),
        ...(input.tipo !== undefined ? { tipo: input.tipo } : {}),
        ...(input.valor !== undefined ? { valor: input.valor } : {}),
        ...(input.ambito !== undefined ? { ambito: input.ambito } : {}),
        ...(input.producto !== undefined
          ? { producto: input.producto || null }
          : {}),
        ...(input.comisionistaId !== undefined
          ? { comisionistaId: input.comisionistaId || null }
          : {}),
        ...(input.sucursalId !== undefined
          ? { sucursalId: input.sucursalId || null }
          : {}),
        ...(input.prioridad !== undefined ? { prioridad: input.prioridad } : {}),
        ...(input.acumulable !== undefined
          ? { acumulable: input.acumulable }
          : {}),
        ...(input.activa !== undefined ? { activa: input.activa } : {}),
        ...(input.vigenciaDesde !== undefined
          ? { vigenciaDesde: aFecha(input.vigenciaDesde) ?? null }
          : {}),
        ...(input.vigenciaHasta !== undefined
          ? { vigenciaHasta: aFecha(input.vigenciaHasta) ?? null }
          : {}),
      },
    });
  }

  async eliminar(empresaId: string, id: string) {
    const regla = await this.prisma.reglaComision.findFirst({
      where: { id, empresaId },
    });
    if (!regla) throw new NotFoundException('Regla no encontrada');
    await this.prisma.reglaComision.delete({ where: { id } });
    return { eliminada: true };
  }

  async sugerir(empresaId: string, query: ReglaSugerirInput) {
    const ahora = new Date();
    const reglas = await this.prisma.reglaComision.findMany({
      where: {
        empresaId,
        activa: true,
        AND: [
          { OR: [{ vigenciaDesde: null }, { vigenciaDesde: { lte: ahora } }] },
          { OR: [{ vigenciaHasta: null }, { vigenciaHasta: { gte: ahora } }] },
        ],
      },
      orderBy: [{ prioridad: 'asc' }],
    });

    const producto = query.producto ? normalizar(query.producto) : null;

    const aplicables = reglas.filter((r) => {
      if (r.ambito === 'GLOBAL') return true;
      if (r.ambito === 'PRODUCTO') {
        return !!producto && !!r.producto && normalizar(r.producto) === producto;
      }
      if (r.ambito === 'COMISIONISTA') {
        return !!query.comisionistaId && r.comisionistaId === query.comisionistaId;
      }
      if (r.ambito === 'SUCURSAL') {
        return !!query.sucursalId && r.sucursalId === query.sucursalId;
      }
      return false;
    });

    aplicables.sort((a, b) => {
      const especificidadA = especificidad[a.ambito] ?? 0;
      const especificidadB = especificidad[b.ambito] ?? 0;
      if (especificidadA !== especificidadB) return especificidadB - especificidadA;
      return a.prioridad - b.prioridad;
    });

    const ganadora = aplicables[0];
    if (!ganadora) return null;

    return {
      id: ganadora.id,
      nombre: ganadora.nombre,
      tipo: ganadora.tipo,
      valor: Number(ganadora.valor),
      ambito: ganadora.ambito,
      acumulable: ganadora.acumulable,
    };
  }
}
