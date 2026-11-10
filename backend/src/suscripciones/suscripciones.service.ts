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

@Injectable()
export class SuscripcionesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async crear(empresaId: string, data: SuscripcionCreateInput) {
    const comisionista = await this.prisma.comisionista.findFirst({
      where: { id: data.comisionistaId, empresaId },
    });
    if (!comisionista) {
      throw new NotFoundException('Comisionista no encontrado');
    }

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
        producto: data.producto ?? null,
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

  async actualizar(
    empresaId: string,
    id: string,
    data: SuscripcionUpdateInput,
  ) {
    const actual = await this.obtener(empresaId, id);

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
        ...(data.producto !== undefined ? { producto: data.producto } : {}),
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
}
