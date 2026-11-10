import { Injectable } from '@nestjs/common';

import type { MetaUpsertInput } from '../common/validators.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MetasService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(
    empresaId: string,
    mes: string,
    soloComisionistaId?: string | null,
  ) {
    const metas = await this.prisma.meta.findMany({
      where: {
        empresaId,
        periodo: mes,
        ...(soloComisionistaId
          ? { OR: [{ comisionistaId: null }, { comisionistaId: soloComisionistaId }] }
          : {}),
      },
    });

    const general = metas.find((m) => !m.comisionistaId);

    return {
      mes,
      general: general ? Number(general.monto) : null,
      comisionistas: metas
        .filter((m) => m.comisionistaId)
        .map((m) => ({
          comisionistaId: m.comisionistaId as string,
          monto: Number(m.monto),
        })),
    };
  }

  async fijar(empresaId: string, input: MetaUpsertInput) {
    const comisionistaId = input.comisionistaId ?? null;
    const existente = await this.prisma.meta.findFirst({
      where: { empresaId, periodo: input.mes, comisionistaId },
    });

    if (input.monto === null) {
      if (existente) {
        await this.prisma.meta.delete({ where: { id: existente.id } });
      }
      return { eliminada: true };
    }

    if (existente) {
      return this.prisma.meta.update({
        where: { id: existente.id },
        data: { monto: input.monto },
      });
    }

    return this.prisma.meta.create({
      data: {
        empresaId,
        periodo: input.mes,
        comisionistaId,
        monto: input.monto,
      },
    });
  }

  async mapaMes(empresaId: string, mes: string) {
    const metas = await this.prisma.meta.findMany({
      where: { empresaId, periodo: mes },
    });
    const general = metas.find((m) => !m.comisionistaId);
    const individuales = new Map(
      metas
        .filter((m) => m.comisionistaId)
        .map((m) => [m.comisionistaId as string, Number(m.monto)]),
    );
    return {
      general: general ? Number(general.monto) : null,
      individuales,
    };
  }
}
