import { Injectable } from '@nestjs/common';

import { mesActualCostaRica, rangoMes } from '../common/periodo.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MetasService } from '../metas/metas.service.js';
import { ComisionesSuscripcionService } from '../suscripciones/comisiones-suscripcion.service.js';

function mesAnterior(mes: string): string {
  const [anio, numero] = mes.split('-').map(Number);
  const fecha = new Date(Date.UTC(anio, numero - 2, 1));
  return `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}`;
}

interface FilaVenta {
  fecha: Date;
  neto: unknown;
  comisionMonto: unknown;
}

@Injectable()
export class ResumenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly comisionesSvc: ComisionesSuscripcionService,
    private readonly metasSvc: MetasService,
  ) {}

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

    const previo = rangoMes(mesAnterior(mes));
    const wherePrevio = {
      ...where,
      fecha: { gte: previo.desde, lt: previo.hasta },
    };

    const whereComision = {
      empresaId,
      periodo: mes,
      ...(soloComisionistaId ? { comisionistaId: soloComisionistaId } : {}),
    };

    const [totales, porComisionista, porSucursal, porSucursalPrevio, ventas, activos, pendiente, enBorrador, pagada, comisiones, pendienteCom, porComisionistaCom, metasMes] =
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
        this.prisma.venta.groupBy({
          by: ['sucursalId'],
          where,
          _count: { _all: true },
          _sum: { neto: true, comisionMonto: true },
        }),
        this.prisma.venta.groupBy({
          by: ['sucursalId'],
          where: wherePrevio,
          _sum: { neto: true },
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
        this.metasSvc.mapaMes(empresaId, mes),
      ]);

    const idsComisionistas = [
      ...new Set([
        ...porComisionista.map((f) => f.comisionistaId),
        ...porComisionistaCom.map((f) => f.comisionistaId),
      ]),
    ];
    const idsSucursales = porSucursal.map((f) => f.sucursalId);

    const [comisionistas, sucursales] = await Promise.all([
      this.prisma.comisionista.findMany({
        where: { id: { in: idsComisionistas } },
        select: { id: true, nombre: true },
      }),
      this.prisma.sucursal.findMany({
        where: { id: { in: idsSucursales } },
        select: { id: true, nombre: true },
      }),
    ]);

    const nombreComisionista = new Map(
      comisionistas.map((c) => [c.id, c.nombre]),
    );
    const nombreSucursal = new Map(sucursales.map((s) => [s.id, s.nombre]));

    const porDia = new Map<string, { monto: number; comision: number }>();
    for (const venta of ventas as FilaVenta[]) {
      const dia = venta.fecha.toISOString().slice(0, 10);
      const actual = porDia.get(dia) ?? { monto: 0, comision: 0 };
      actual.monto += Number(venta.neto);
      actual.comision += Number(venta.comisionMonto);
      porDia.set(dia, actual);
    }

    const comisionVentas = Number(totales._sum.comisionMonto ?? 0);
    const comisionSuscripciones = Number(comisiones._sum.monto ?? 0);

    const filas = new Map<
      string,
      { ventas: number; montoVendido: number; comision: number }
    >();
    for (const f of porComisionista) {
      filas.set(f.comisionistaId, {
        ventas: f._count._all,
        montoVendido: Number(f._sum.neto ?? 0),
        comision: Number(f._sum.comisionMonto ?? 0),
      });
    }
    for (const f of porComisionistaCom) {
      const actual = filas.get(f.comisionistaId) ?? {
        ventas: 0,
        montoVendido: 0,
        comision: 0,
      };
      actual.montoVendido += Number(f._sum.base ?? 0);
      actual.comision += Number(f._sum.monto ?? 0);
      filas.set(f.comisionistaId, actual);
    }

    return {
      mes,
      mesAnterior: mesAnterior(mes),
      desde: desde.toISOString(),
      hasta: hasta.toISOString(),
      totalVentas: totales._count._all,
      montoVendido: Number(totales._sum.neto ?? 0),
      totalComision: comisionVentas + comisionSuscripciones,
      comisionVentas,
      comisionSuscripciones,
      ingresoRecurrente: Number(comisiones._sum.base ?? 0),
      comisionistasActivos: activos,
      comisionPendiente:
        Number(pendiente._sum.comisionMonto ?? 0) +
        Number(enBorrador._sum.comisionTotal ?? 0) +
        Number(pendienteCom._sum.monto ?? 0),
      comisionPagada: Number(pagada._sum.comisionTotal ?? 0),
      metaGeneral: metasMes.general,
      porComisionista: [...filas.entries()]
        .map(([id, valores]) => {
          const meta =
            metasMes.individuales.get(id) ?? metasMes.general ?? null;
          return {
            id,
            nombre: nombreComisionista.get(id) ?? 'Sin nombre',
            ...valores,
            meta,
            avance:
              meta && meta > 0
                ? Math.round((valores.montoVendido / meta) * 1000) / 10
                : null,
          };
        })
        .sort((a, b) => b.comision - a.comision),
      porSucursal: porSucursal
        .map((f) => {
          const anterior =
            porSucursalPrevio.find((p) => p.sucursalId === f.sucursalId)?._sum
              .neto ?? 0;
          const actual = Number(f._sum.neto ?? 0);
          return {
            id: f.sucursalId,
            nombre: nombreSucursal.get(f.sucursalId) ?? 'Sin sucursal',
            ventas: f._count._all,
            montoVendido: actual,
            comision: Number(f._sum.comisionMonto ?? 0),
            montoAnterior: Number(anterior),
            variacion:
              Number(anterior) > 0
                ? Math.round(((actual - Number(anterior)) / Number(anterior)) * 1000) / 10
                : null,
          };
        })
        .sort((a, b) => b.montoVendido - a.montoVendido),
      porDia: [...porDia.entries()]
        .map(([fecha, valores]) => ({ fecha, ...valores }))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    };
  }
}
