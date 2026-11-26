import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type {
  SuscripcionCreateInput,
  SuscripcionQueryInput,
  SuscripcionUpdateInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

const incluir = {
  comisionista: { select: { id: true, nombre: true } },
} as const;

// Suscripciones: clientes que pagan cada cierto tiempo (mensual, anual, etc.)
// y generan comisión de forma recurrente.
@Injectable()
export class SuscripcionesService {
  constructor(private readonly prisma: PrismaService) {}

  // Lista las suscripciones con filtros por estado y comisionista.
  listar(
    empresaId: string,
    query: SuscripcionQueryInput,
    soloComisionistaId?: string | null,
  ) {
    return this.prisma.suscripcion.findMany({
      where: {
        empresaId,
        ...(query.estado ? { estado: query.estado } : {}),
        comisionistaId: soloComisionistaId ?? query.comisionistaId,
      },
      include: incluir,
      orderBy: [{ estado: 'asc' }, { creadoEn: 'desc' }],
    });
  }

  // Trae una suscripción con su comisionista y las comisiones generadas.
  async obtener(empresaId: string, id: string) {
    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: { id, empresaId },
      include: incluir,
    });
    if (!suscripcion) {
      throw new NotFoundException('Suscripción no encontrada');
    }
    return suscripcion;
  }

  // Busca el producto del catálogo y valida que sea de la empresa.
  private async buscarCatalogo(empresaId: string, catalogoId: string) {
    const catalogo = await this.prisma.catalogo.findFirst({
      where: { id: catalogoId, empresaId },
    });
    if (!catalogo) {
      throw new NotFoundException('Producto del catálogo no encontrado');
    }
    if (!catalogo.activo) {
      throw new BadRequestException('Ese producto está inactivo');
    }
    return catalogo;
  }

  // Registra una suscripción nueva y calcula cuándo toca la próxima cobranza.
  async crear(empresaId: string, data: SuscripcionCreateInput) {
    const comisionista = await this.prisma.comisionista.findFirst({
      where: { id: data.comisionistaId, empresaId },
    });
    if (!comisionista) {
      throw new NotFoundException('Comisionista no encontrado');
    }

    const catalogo = data.catalogoId
      ? await this.buscarCatalogo(empresaId, data.catalogoId)
      : null;

    const inicio = new Date(`${data.inicio}T06:00:00Z`);
    const fin = data.fin ? new Date(`${data.fin}T06:00:00Z`) : null;
    if (fin && fin < inicio) {
      throw new BadRequestException('La fecha final no puede ser anterior al inicio');
    }

    return this.prisma.suscripcion.create({
      data: {
        empresaId,
        comisionistaId: data.comisionistaId,
        cliente: data.cliente,
        producto: catalogo ? catalogo.nombre : (data.producto ?? null),
        catalogoId: catalogo?.id ?? null,
        monto: data.monto,
        frecuenciaCobro: data.frecuenciaCobro,
        comisionTipo: data.comisionTipo,
        comisionValor: data.comisionValor,
        comisionFrecuencia: data.comisionFrecuencia,
        inicio,
        fin,
      },
      include: incluir,
    });
  }

  // Edita los datos de la suscripción. Si cambia el monto o el porcentaje,
  // se vuelve a calcular la comisión de los meses que aún no se han liquidado.
  async actualizar(
    empresaId: string,
    id: string,
    data: SuscripcionUpdateInput,
  ) {
    const actual = await this.obtener(empresaId, id);

    const catalogo =
      data.catalogoId === undefined
        ? undefined
        : data.catalogoId === null
          ? null
          : await this.buscarCatalogo(empresaId, data.catalogoId);

    const inicio = data.inicio
      ? new Date(`${data.inicio}T06:00:00Z`)
      : actual.inicio;
    const fin =
      data.fin === undefined
        ? actual.fin
        : data.fin === null
          ? null
          : new Date(`${data.fin}T06:00:00Z`);

    if (fin && fin < inicio) {
      throw new BadRequestException('La fecha final no puede ser anterior al inicio');
    }

    return this.prisma.suscripcion.update({
      where: { id },
      data: {
        ...(data.cliente !== undefined ? { cliente: data.cliente } : {}),
        ...(catalogo !== undefined
          ? {
              catalogoId: catalogo?.id ?? null,
              producto: catalogo ? catalogo.nombre : data.producto ?? null,
            }
          : data.producto !== undefined
            ? { producto: data.producto }
            : {}),
        ...(data.monto !== undefined ? { monto: data.monto } : {}),
        ...(data.frecuenciaCobro !== undefined
          ? { frecuenciaCobro: data.frecuenciaCobro }
          : {}),
        ...(data.comisionTipo !== undefined
          ? { comisionTipo: data.comisionTipo }
          : {}),
        ...(data.comisionValor !== undefined
          ? { comisionValor: data.comisionValor }
          : {}),
        ...(data.comisionFrecuencia !== undefined
          ? { comisionFrecuencia: data.comisionFrecuencia }
          : {}),
        inicio,
        fin,
      },
      include: incluir,
    });
  }

  // Pausa, reactiva o finaliza una suscripción sin borrarla.
  async cambiarEstado(
    empresaId: string,
    id: string,
    estado: 'PAUSADA' | 'FINALIZADA' | 'ACTIVA',
  ) {
    const actual = await this.obtener(empresaId, id);
    if (actual.estado === estado) return actual;
    if (actual.estado === 'FINALIZADA' && estado !== 'ACTIVA') return actual;

    return this.prisma.suscripcion.update({
      where: { id },
      data: { estado },
      include: incluir,
    });
  }

  // Suscripciones activas que terminan dentro de los próximos días.
  porVencer(
    empresaId: string,
    dias = 7,
    soloComisionistaId?: string | null,
  ) {
    const hoy = new Date();
    const limite = new Date(hoy.getTime() + dias * 24 * 60 * 60 * 1000);
    return this.prisma.suscripcion.findMany({
      where: {
        empresaId,
        estado: 'ACTIVA',
        fin: { not: null, gte: hoy, lte: limite },
        ...(soloComisionistaId ? { comisionistaId: soloComisionistaId } : {}),
      },
      include: incluir,
      orderBy: { fin: 'asc' },
    });
  }

  // Borra definitivamente una suscripción finalizada y sus comisiones.
  async eliminar(empresaId: string, id: string) {
    const actual = await this.obtener(empresaId, id);
    if (actual.estado !== 'FINALIZADA') {
      throw new BadRequestException(
        'Solo se puede borrar una suscripción finalizada',
      );
    }
    await this.prisma.$transaction([
      this.prisma.comisionSuscripcion.deleteMany({
        where: { suscripcionId: id, empresaId },
      }),
      this.prisma.suscripcion.delete({ where: { id } }),
    ]);
    return { ok: true };
  }
}
