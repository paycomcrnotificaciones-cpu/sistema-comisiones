import { Injectable } from '@nestjs/common';

import { mesActualCostaRica, rangoMes } from '../common/periodo.js';
import { Decimal } from 'decimal.js';

import { aDecimal, aNumero } from '../common/dinero.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ComisionesSuscripcionService } from '../suscripciones/comisiones-suscripcion.service.js';

// Recibe un mes AAAA-MM y devuelve el anterior (2026-01 -> 2025-12).
// Se usa para comparar las ventas de este mes contra las del mes pasado.
function mesAnterior(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, numero - 2, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

// Los montos llegan de la base como Decimal, por eso se tipan como unknown
// y se convierten con Number() al hacer las sumas.
interface FilaVenta {
  fecha: Date;
  neto: unknown;
  comisionMonto: unknown;
}

// Arma el panel del mes: totales, ranking de comisionistas y ventas por día.
@Injectable()
export class ResumenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comisionesSvc: ComisionesSuscripcionService,
  ) {}

  // Devuelve todo lo que muestra la pantalla de Resumen para un mes.
  // Si viene soloComisionistaId, el resumen se limita a esa persona
  // (es el caso del comisionista que entra con su usuario).
  // Las consultas se lanzan todas a la vez con Promise.all para que sea rápido.
  async obtener(
    empresaId: string,
    mesParam: string | undefined,
    soloComisionistaId?: string | null,
  ) {
    const mes = mesParam ?? mesActualCostaRica();
    const { desde, hasta } = rangoMes(mes);
    await this.comisionesSvc.asegurarMes(empresaId, mes);

    const where = {
      empresaId,
      estado: 'ACTIVA' as const,
      ...(soloComisionistaId ? { comisionistaId: soloComisionistaId } : {}),
      fecha: { gte: desde, lt: hasta },
    };

    const whereComision = {
      empresaId,
      periodo: mes,
      ...(soloComisionistaId ? { comisionistaId: soloComisionistaId } : {}),
    };

    const [totales, porComisionista, ventas, activos, pendiente, enBorrador, pagada, comisiones, pendienteCom, porComisionistaCom] =
      await Promise.all([
        this.prisma.venta.aggregate({
          where,
          _count: { _all: true },
          _sum: { neto: true, comisionMonto: true },
        }),
        this.prisma.venta.groupBy({
          by: ['comisionistaId'],
          where,
          _count: { _all: true },
          _sum: { neto: true, comisionMonto: true },
        }),
        this.prisma.venta.findMany({
          where,
          select: { fecha: true, neto: true, comisionMonto: true },
        }),
        this.prisma.comisionista.count({
          where: {
            empresaId,
            activo: true,
            ...(soloComisionistaId ? { id: soloComisionistaId } : {}),
          },
        }),
        this.prisma.venta.aggregate({
          where: { ...where, liquidacionId: null },
          _sum: { comisionMonto: true },
        }),
        this.prisma.liquidacion.aggregate({
          where: {
            empresaId,
            periodo: mes,
            estado: 'BORRADOR',
            ...(soloComisionistaId
              ? { comisionistaId: soloComisionistaId }
              : {}),
          },
          _sum: { comisionTotal: true },
        }),
        this.prisma.liquidacion.aggregate({
          where: {
            empresaId,
            periodo: mes,
            estado: 'PAGADA',
            ...(soloComisionistaId
              ? { comisionistaId: soloComisionistaId }
              : {}),
          },
          _sum: { comisionTotal: true },
        }),
        this.prisma.comisionSuscripcion.aggregate({
          where: whereComision,
          _sum: { base: true, monto: true },
        }),
        this.prisma.comisionSuscripcion.aggregate({
          where: { ...whereComision, liquidacionId: null },
          _sum: { monto: true },
        }),
        this.prisma.comisionSuscripcion.groupBy({
          by: ['comisionistaId'],
          where: whereComision,
          _sum: { base: true, monto: true },
        }),
      ]);

    // Los groupBy devuelven solo ids; aquí se buscan los nombres para mostrarlos.
    const idsComisionistas = [
      ...new Set([
        ...porComisionista.map((f) => f.comisionistaId),
        ...porComisionistaCom.map((f) => f.comisionistaId),
      ]),
    ];
    const comisionistas = await this.prisma.comisionista.findMany({
      where: { id: { in: idsComisionistas } },
      select: { id: true, nombre: true },
    });

    const nombreComisionista = new Map(
      comisionistas.map((c) => [c.id, c.nombre]),
    );

    // Agrupa las ventas del mes por día para dibujar la gráfica de barras.
    const porDia = new Map<string, { monto: Decimal; comision: Decimal }>();
    for (const venta of ventas as FilaVenta[]) {
      const dia = venta.fecha.toISOString().slice(0, 10);
      const actual = porDia.get(dia) ?? {
        monto: new Decimal(0),
        comision: new Decimal(0),
      };
      actual.monto = actual.monto.plus(aDecimal(venta.neto));
      actual.comision = actual.comision.plus(aDecimal(venta.comisionMonto));
      porDia.set(dia, actual);
    }

    const comisionVentas = aDecimal(totales._sum.comisionMonto ?? 0);
    const comisionSuscripciones = aDecimal(comisiones._sum.monto ?? 0);

    // Une las comisiones de ventas con las de suscripciones en una sola fila
    // por comisionista, para que el ranking muestre el total real.
    const filas = new Map<
      string,
      { ventas: number; montoVendido: Decimal; comision: Decimal }
    >();
    for (const f of porComisionista) {
      filas.set(f.comisionistaId, {
        ventas: f._count._all,
        montoVendido: aDecimal(f._sum.neto ?? 0),
        comision: aDecimal(f._sum.comisionMonto ?? 0),
      });
    }
    for (const f of porComisionistaCom) {
      const actual = filas.get(f.comisionistaId) ?? {
        ventas: 0,
        montoVendido: new Decimal(0),
        comision: new Decimal(0),
      };
      actual.montoVendido = actual.montoVendido.plus(aDecimal(f._sum.base ?? 0));
      actual.comision = actual.comision.plus(aDecimal(f._sum.monto ?? 0));
      filas.set(f.comisionistaId, actual);
    }

    // Respuesta final que consume el frontend.
    // "comisionPendiente" suma tres cosas: ventas sin liquidar, liquidaciones
    // en borrador y comisiones de suscripciones que aún no se liquidan.
    return {
      mes,
      mesAnterior: mesAnterior(mes),
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      totalVentas: totales._count._all,
      montoVendido: aNumero(totales._sum.neto ?? 0),
      totalComision: aNumero(comisionVentas.plus(comisionSuscripciones)),
      comisionVentas: aNumero(comisionVentas),
      comisionSuscripciones: aNumero(comisionSuscripciones),
      ingresoRecurrente: aNumero(comisiones._sum.base ?? 0),
      comisionistasActivos: activos,
      comisionPendiente: aNumero(
        aDecimal(pendiente._sum.comisionMonto ?? 0)
          .plus(aDecimal(enBorrador._sum.comisionTotal ?? 0))
          .plus(aDecimal(pendienteCom._sum.monto ?? 0)),
      ),
      comisionPagada: aNumero(pagada._sum.comisionTotal ?? 0),
      porComisionista: [...filas.entries()]
        .map(([id, valores]) => ({
          id,
          nombre: nombreComisionista.get(id) ?? 'Sin nombre',
          ventas: valores.ventas,
          montoVendido: aNumero(valores.montoVendido),
          comision: aNumero(valores.comision),
        }))
        .sort((a, b) => b.comision - a.comision),
      porDia: [...porDia.entries()]
        .map(([fecha, valores]) => ({
          fecha,
          monto: aNumero(valores.monto),
          comision: aNumero(valores.comision),
        }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    };
  }
}
