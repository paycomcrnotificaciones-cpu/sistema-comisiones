import { BadRequestException, ConflictException, Injectable, NotFoundException }from '@nestjs/common';

import type {
  VentaCreateInput,
  VentaQueryInput,
  VentaUpdateInput,
} from '../common/validators.js';
import { aDecimal, aTexto, comparar, porcentaje } from '../common/dinero.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Calcula cuánto gana el comisionista por una venta.
// Si la comisión es en porcentaje se aplica sobre el neto; si es monto fijo,
// se paga ese monto tal cual. Se guardan 4 decimales para no perder centavos.
function calcularComisionMonto(
  tipo: 'PORCENTAJE' | 'MONTO_FIJO',
  neto: string,
  valor: string,
): string {
  // La cuenta se hace con Decimal para que el resultado no arrastre el
  // error de la coma flotante (importante en montos grandes).
  return tipo === 'PORCENTAJE' ? porcentaje(neto, valor) : aTexto(valor);
}

// Toda la lógica de las ventas: listar con filtros, crear, editar,
// exportar a CSV y anular. Solo se puede editar o anular mientras la venta
// no haya entrado en una liquidación.
@Injectable()
export class VentasService {
    constructor(private readonly prisma: PrismaService){}

    // Arma el filtro de búsqueda que comparten el listado y la exportación.
    // Las fechas se toman desde las 6 de la mañana (hora de Costa Rica) para
    // que una venta del día cuente en el día correcto.
    private construirWhere(
        empresaId: string,
        query: VentaQueryInput,
        soloComisionistaId?: string | null,
    ) {
        const { desde, hasta, comisionistaId, estado, pago, q } = query;

        const hastaExclusivo = hasta
            ? new Date(new Date(`${hasta}T06:00:00Z`).getTime() + 24 * 60 * 60 * 1000)
            : undefined;

        return {
            empresaId,
            comisionistaId: soloComisionistaId ?? comisionistaId,
            estado,
            ...(q ? { producto: { contains: q, mode: 'insensitive' as const } } : {}),
            ...(pago === 'PAGADA'
                ? { liquidacion: { is: { estado: 'PAGADA' as const } } }
                : pago === 'PENDIENTE'
                  ? {
                        OR: [
                            { liquidacionId: null },
                            { liquidacion: { is: { estado: 'BORRADOR' as const } } },
                        ],
                    }
                  : {}),
            fecha: {
                gte: desde ? new Date(`${desde}T06:00:00Z`) : undefined,
                lt: hastaExclusivo,
            },
        };
    }

    // Lista las ventas con paginación y devuelve, además, los totales del
    // filtro: monto vendido, comisión generada, pagada y pendiente.
    // Las cuatro consultas van juntas en una transacción para que los totales
    // correspondan exactamente a la misma información.
    async listar(
        empresaId: string,
        query: VentaQueryInput,
        soloComisionistaId?: string | null,
    ){
        const {pagina, limite } = query;

        const where = this.construirWhere(empresaId, query, soloComisionistaId);

        const whereActivas = { ...where, estado: 'ACTIVA' as const };

        const [total, suma, pagada, pendiente, datos] = await this.prisma.$transaction([
            this.prisma.venta.count({ where }),
            this.prisma.venta.aggregate({
                where: whereActivas,
                _sum: { neto: true, comisionMonto: true },
            }),
            this.prisma.venta.aggregate({
                where: {
                    ...whereActivas,
                    liquidacion: { is: { estado: 'PAGADA' } },
                },
                _sum: { comisionMonto: true },
            }),
            this.prisma.venta.aggregate({
                where: {
                    ...whereActivas,
                    OR: [
                        { liquidacionId: null },
                        { liquidacion: { is: { estado: 'BORRADOR' } } },
                    ],
                },
                _sum: { comisionMonto: true },
            }),
            this.prisma.venta.findMany({
                where,
                orderBy: [{ fecha: 'desc'}, { creadoEn: 'desc'}],
                skip: (pagina - 1) * limite,
                take: limite, 
                include: {
                    comisionista: { select: { id: true, nombre: true}},
                    liquidacion: { select: { id: true, estado: true }},
                },
            }),
        ]);

        return {
            total,
            pagina,
            limite,
            datos,
            montoVendido: aDecimal(suma._sum.neto ?? 0).toFixed(2),
            totalComision: aDecimal(suma._sum.comisionMonto ?? 0).toFixed(2),
            comisionPendiente: aDecimal(pendiente._sum.comisionMonto ?? 0).toFixed(2),
            comisionPagada: aDecimal(pagada._sum.comisionMonto ?? 0).toFixed(2),
        };
    }

    // Registra una venta nueva. Revisa que el comisionista exista en la
    // empresa y calcula la comisión en el momento de guardar.
    async crear(empresaId: string, data: VentaCreateInput) {
    const comisionista = await this.prisma.comisionista.findFirst({
      where: { id: data.comisionistaId, empresaId },
    });
    if (!comisionista) throw new NotFoundException('Comisionista no encontrado');

    try {
      return await this.prisma.venta.create({
        data: {
          empresaId,
          comisionistaId: data.comisionistaId,
          fecha: new Date(`${data.fecha}T06:00:00Z`),
          documento: data.documento ?? null,
          cliente: data.cliente ?? null,
          producto: data.producto ?? null,
          categoria: data.categoria ?? null,
          bruto: data.bruto,
          neto: data.neto,
          costo: data.costo ?? '0',
          comisionTipo: data.comisionTipo,
          comisionValor: data.comisionValor,
          comisionMonto: calcularComisionMonto(
            data.comisionTipo,
            data.neto,
            data.comisionValor,
          ),
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' && error !== null &&
        'code' in error && error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe una venta con ese documento');
      }
      throw error;
    }
  }

  // Edita una venta. Si cambia el monto o el porcentaje, se vuelve a calcular
  // la comisión. No se permite tocar una venta que ya está en una liquidación.
  async actualizar(
    empresaId: string,
    id: string,
    data: VentaUpdateInput,
  ) {
    const actual = await this.prisma.venta.findFirst({
      where: { id, empresaId },
    });
    if (!actual) {
      throw new NotFoundException('Venta no encontrada');
    }
    if (actual.liquidacionId) {
      throw new ConflictException(
        'La venta ya está en una liquidación y no se puede editar',
      );
    }

    const comisionistaId = data.comisionistaId ?? actual.comisionistaId;

    const comisionista = await this.prisma.comisionista.findFirst({
      where: { id: comisionistaId, empresaId },
    });
    if (!comisionista) {
      throw new NotFoundException('Comisionista no encontrado');
    }

    const bruto = data.bruto ?? actual.bruto.toString();
    const neto = data.neto ?? actual.neto.toString();
    if (comparar(neto, bruto) > 0) {
      throw new BadRequestException(
        'El neto no puede ser mayor que el bruto',
      );
    }

    const comisionTipo = data.comisionTipo ?? actual.comisionTipo;
    const comisionValor =
      data.comisionValor ?? actual.comisionValor.toString();
    if (comisionTipo === 'PORCENTAJE' && comparar(comisionValor, 100) > 0) {
      throw new BadRequestException(
        'El porcentaje de comisión no puede ser mayor a 100',
      );
    }

    return this.prisma.venta.update({
      where: { id },
      data: {
        comisionistaId,
        ...(data.fecha
          ? { fecha: new Date(`${data.fecha}T06:00:00Z`) }
          : {}),
        ...(data.documento !== undefined
          ? { documento: data.documento }
          : {}),
        ...(data.cliente !== undefined ? { cliente: data.cliente } : {}),
        ...(data.producto !== undefined ? { producto: data.producto } : {}),
        ...(data.categoria !== undefined
          ? { categoria: data.categoria }
          : {}),
        bruto,
        neto,
        ...(data.costo !== undefined ? { costo: data.costo } : {}),
        comisionTipo,
        comisionValor,
        comisionMonto: calcularComisionMonto(
          comisionTipo,
          neto,
          comisionValor,
        ),
      },
      include: {
        comisionista: { select: { id: true, nombre: true } },
      },
    });
  }

  // Devuelve todas las ventas del filtro en formato CSV.
  // Se agrega el BOM al inicio para que Excel muestre bien las tildes.
  async exportar(
    empresaId: string,
    query: VentaQueryInput,
    soloComisionistaId?: string | null,
  ) {
    const datos = await this.prisma.venta.findMany({
      where: this.construirWhere(empresaId, query, soloComisionistaId),
      orderBy: [{ fecha: 'asc' }, { creadoEn: 'asc' }],
      include: {
        comisionista: { select: { nombre: true } },
      },
    });

    // Arma una celda entre comillas y escapa las comillas internas.
    // Si un texto empieza con =, +, - o @, se le antepone un apóstrofo:
    // así Excel y Sheets no lo ejecutan como fórmula (inyección CSV).
    const celda = (valor: string | number | null | undefined): string => {
      let texto = valor === null || valor === undefined ? '' : String(valor);
      if (typeof valor === 'string' && /^[=+\-@\t\r]/.test(texto)) {
        texto = `'${texto}`;
      }
      return `"${texto.replace(/"/g, '""')}"`;
    };

    const filas = [
      ['Fecha', 'Comisionista', 'Documento', 'Cliente', 'Producto', 'Monto', 'Comision', 'Tipo', 'Valor', 'Estado'],
      ...datos.map((v) => [
        v.fecha.toISOString().slice(0, 10),
        v.comisionista.nombre,
        v.documento ?? '',
        v.cliente ?? '',
        v.producto ?? '',
        aDecimal(v.neto).toFixed(2),
        aDecimal(v.comisionMonto).toFixed(2),
        v.comisionTipo === 'PORCENTAJE' ? 'Porcentaje' : 'Monto fijo',
        aDecimal(v.comisionValor).toFixed(2),
        v.estado === 'ACTIVA' ? 'Activa' : 'Anulada',
      ]),
    ];

    return (
      '\uFEFF' +
      filas.map((fila) => fila.map(celda).join(',')).join('\r\n')
    );
  }

  // Anula una venta: no se borra, queda marcada como ANULADA para conservar
  // el historial. Tampoco se puede anular si ya fue liquidada.
  async anular(empresaId: string, id: string) {
    const venta = await this.prisma.venta.findFirst({ where: { id, empresaId } });
    if (!venta) throw new NotFoundException('Venta no encontrada');
    if (venta.liquidacionId) {
      throw new ConflictException(
        'La venta ya está en una liquidación y no se puede anular',
      );
    }
    if (venta.estado === 'ANULADA') throw new BadRequestException('La venta ya está anulada');

    return this.prisma.venta.update({ where: { id }, data: { estado: 'ANULADA' } });
  }
}
