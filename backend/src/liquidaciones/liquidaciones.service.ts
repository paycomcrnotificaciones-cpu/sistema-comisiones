import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { rangoMes } from '../common/periodo.js';
import type {
  LiquidacionCreateInput,
  LiquidacionPagarInput,
  LiquidacionQueryInput,
} from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComisionesSuscripcionService } from '../suscripciones/comisiones-suscripcion.service.js';

const incluir = {
  comisionista: { select: { id: true, nombre: true } },
} as const;

// Liquidaciones: cerrar un mes y pagarle al comisionista lo que ganó.
// Una liquidación junta las ventas activas del mes y las comisiones de
// suscripciones, y las marca para que no se vuelvan a cobrar.
@Injectable()
export class LiquidacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comisiones: ComisionesSuscripcionService,
  ) {}

  // Lista las liquidaciones de la empresa, con filtros por mes y estado.
  // Si viene soloComisionistaId, únicamente devuelve las de esa persona.
  async listar(
    empresaId: string,
    query: LiquidacionQueryInput,
    soloComisionistaId?: string | null,
  ) {
    return this.prisma.liquidacion.findMany({
      where: {
        empresaId,
        ...(query.mes ? { periodo: query.mes } : {}),
        ...(query.estado ? { estado: query.estado } : {}),
        comisionistaId: soloComisionistaId ?? query.comisionistaId,
      },
      include: incluir,
      orderBy: [{ periodo: 'desc' }, { creadaEn: 'desc' }],
    });
  }

  // Devuelve una liquidación con el detalle: las ventas y las comisiones
  // que incluye, para poder revisarla o imprimirla.
  async obtener(
    empresaId: string,
    id: string,
    soloComisionistaId?: string | null,
  ) {
    const liquidacion = await this.prisma.liquidacion.findFirst({
      where: {
        id,
        empresaId,
        ...(soloComisionistaId
          ? { comisionistaId: soloComisionistaId }
          : {}),
      },
      include: {
        ...incluir,
        ventas: {
          orderBy: { fecha: 'asc' },
          include: {
            sucursal: { select: { id: true, nombre: true } },
          },
        },
        comisiones: {
          orderBy: { periodo: 'asc' },
          include: {
            suscripcion: { select: { id: true, cliente: true, producto: true } },
          },
        },
      },
    });
    if (!liquidacion) {
      throw new NotFoundException('Liquidación no encontrada');
    }
    return liquidacion;
  }

  // Crea la liquidación de un comisionista para un mes.
  // Pasos: verifica que no exista otra igual, genera las comisiones de
  // suscripciones de ese mes y suma todo lo pendiente. Al final guarda la
  // liquidación y marca esas ventas y comisiones como incluidas, todo dentro
  // de una transacción: si algo falla, no se guarda nada a medias.
  async crear(empresaId: string, data: LiquidacionCreateInput) {
    const comisionista = await this.prisma.comisionista.findFirst({
      where: { id: data.comisionistaId, empresaId },
    });
    if (!comisionista) {
      throw new NotFoundException('Comisionista no encontrado');
    }

    const existente = await this.prisma.liquidacion.findFirst({
      where: {
        empresaId,
        comisionistaId: data.comisionistaId,
        periodo: data.mes,
      },
    });
    if (existente) {
      throw new ConflictException(
        'Ya existe una liquidación para ese comisionista en ese mes',
      );
    }

    await this.comisiones.asegurarMes(empresaId, data.mes);

    const { desde, hasta } = rangoMes(data.mes);
    const ventas = await this.prisma.venta.findMany({
      where: {
        empresaId,
        comisionistaId: data.comisionistaId,
        estado: 'ACTIVA',
        liquidacionId: null,
        fecha: { gte: desde, lt: hasta },
      },
      select: { id: true, comisionMonto: true },
    });

    const comisiones = await this.prisma.comisionSuscripcion.findMany({
      where: {
        empresaId,
        comisionistaId: data.comisionistaId,
        periodo: data.mes,
        liquidacionId: null,
      },
      select: { id: true, monto: true },
    });

    if (ventas.length === 0 && comisiones.length === 0) {
      throw new BadRequestException(
        'No hay ventas ni comisiones pendientes de liquidar en ese mes',
      );
    }

    const comisionTotal = (
      ventas.reduce((suma, v) => suma + Number(v.comisionMonto), 0) +
      comisiones.reduce((suma, c) => suma + Number(c.monto), 0)
    ).toFixed(4);

    return this.prisma.$transaction(async (tx) => {
      const liquidacion = await tx.liquidacion.create({
        data: {
          empresaId,
          comisionistaId: data.comisionistaId,
          periodo: data.mes,
          comisionTotal,
          ventasCount: ventas.length,
          comisionesCount: comisiones.length,
          nota: data.nota ?? null,
        },
        include: incluir,
      });

      if (ventas.length > 0) {
        await tx.venta.updateMany({
          where: { id: { in: ventas.map((v) => v.id) } },
          data: { liquidacionId: liquidacion.id },
        });
      }

      if (comisiones.length > 0) {
        await tx.comisionSuscripcion.updateMany({
          where: { id: { in: comisiones.map((c) => c.id) } },
          data: { liquidacionId: liquidacion.id },
        });
      }

      return liquidacion;
    });
  }

  // Marca la liquidación como pagada y guarda la fecha y el método de pago.
  // Una vez pagada ya no se puede anular.
  async pagar(
    empresaId: string,
    id: string,
    input: LiquidacionPagarInput = { metodoPago: 'EFECTIVO' },
  ) {
    const liquidacion = await this.prisma.liquidacion.findFirst({
      where: { id, empresaId },
    });
    if (!liquidacion) {
      throw new NotFoundException('Liquidación no encontrada');
    }
    if (liquidacion.estado === 'PAGADA') {
      throw new BadRequestException('La liquidación ya está pagada');
    }

    return this.prisma.liquidacion.update({
      where: { id },
      data: {
        estado: 'PAGADA',
        pagadaEn: new Date(),
        metodoPago: input.metodoPago,
        ...(input.nota ? { nota: input.nota } : {}),
      },
      include: incluir,
    });
  }

  // Deshace una liquidación que todavía no se pagó: suelta las ventas y las
  // comisiones para que vuelvan a quedar pendientes, y borra la liquidación.
  async anular(empresaId: string, id: string) {
    const liquidacion = await this.prisma.liquidacion.findFirst({
      where: { id, empresaId },
    });
    if (!liquidacion) {
      throw new NotFoundException('Liquidación no encontrada');
    }
    if (liquidacion.estado === 'PAGADA') {
      throw new BadRequestException(
        'No se puede anular una liquidación ya pagada',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.venta.updateMany({
        where: { liquidacionId: id },
        data: { liquidacionId: null },
      });
      await tx.comisionSuscripcion.updateMany({
        where: { liquidacionId: id },
        data: { liquidacionId: null },
      });
      await tx.liquidacion.delete({ where: { id } });
    });

    return { eliminada: true };
  }
}
