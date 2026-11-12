import { Injectable } from '@nestjs/common';
import type { Frecuencia } from '../generated/prisma/enums.js';

import { rangoMes } from '../common/periodo.js';
import { PrismaService } from '../prisma/prisma.service.js';

// Cuántos meses abarca cada frecuencia de cobro (UNICA solo ocurre una vez).
const MESES: Record<Frecuencia, number> = {
  MENSUAL: 1,
  TRIMESTRAL: 3,
  SEMESTRAL: 6,
  ANUAL: 12,
  UNICA: 0,
};

// Convierte una fecha en un número de mes continuo (año * 12 + mes).
// Así se puede restar y saber cuántos meses hay entre dos fechas.
function indiceMes(fecha: Date): number {
  return fecha.getUTCFullYear() * 12 + fecha.getUTCMonth();
}

// Lo mismo que indiceMes, pero partiendo de un texto AAAA-MM.
function indiceDePeriodo(periodo: string): number {
  const [anio, mes] = periodo.split('-').map(Number);
  return anio * 12 + (mes - 1);
}

// Guarda 4 decimales para no perder centavos al calcular porcentajes.
function redondear(valor: number): string {
  return valor.toFixed(4);
}

@Injectable()
export class ComisionesSuscripcionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera (si faltan) las comisiones de suscripción que corresponden al mes.
   * Es idempotente: nunca duplica ni sobreescribe comisiones existentes.
   */
  async asegurarMes(empresaId: string, mes: string): Promise<number> {
    const { desde, hasta } = rangoMes(mes);
    const objetivo = indiceDePeriodo(mes);

    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        empresaId,
        estado: 'ACTIVA',
        inicio: { lt: hasta },
        OR: [{ fin: null }, { fin: { gte: desde } }],
      },
    });

    let creadas = 0;

    for (const suscripcion of suscripciones) {
      const inicio = indiceMes(suscripcion.inicio);
      const fin = suscripcion.fin ? indiceMes(suscripcion.fin) : null;

      if (objetivo < inicio) continue;
      if (fin !== null && objetivo > fin) continue;

      const diferencia = objetivo - inicio;
      const unica =
        suscripcion.frecuenciaCobro === 'UNICA' ||
        suscripcion.comisionFrecuencia === 'UNICA';

      if (unica) {
        if (diferencia !== 0) continue;
      } else {
        const paso = MESES[suscripcion.comisionFrecuencia];
        if (paso <= 0 || diferencia % paso !== 0) continue;
      }

      const mesesCobro = MESES[suscripcion.frecuenciaCobro];
      const mesesComision = MESES[suscripcion.comisionFrecuencia];
      const base =
        unica || mesesCobro === 0 || mesesComision === 0
          ? Number(suscripcion.monto)
          : (Number(suscripcion.monto) * mesesComision) / mesesCobro;

      const monto =
        suscripcion.comisionTipo === 'PORCENTAJE'
          ? (base * Number(suscripcion.comisionValor)) / 100
          : Number(suscripcion.comisionValor);

      try {
        await this.prisma.comisionSuscripcion.upsert({
          where: {
            suscripcionId_periodo: {
              suscripcionId: suscripcion.id,
              periodo: mes,
            },
          },
          update: {},
          create: {
            empresaId,
            suscripcionId: suscripcion.id,
            comisionistaId: suscripcion.comisionistaId,
            periodo: mes,
            base: redondear(base),
            monto: redondear(monto),
          },
        });
        creadas += 1;
      } catch {
        // Ya existía (condición de carrera); se conserva el valor original.
      }
    }

    return creadas;
  }
}
