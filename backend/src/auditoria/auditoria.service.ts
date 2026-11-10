import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

interface RegistroAuditoria {
  empresaId: string;
  usuarioId?: string | null;
  usuario: string;
  rol?: string | null;
  accion: string;
  entidad?: string | null;
  entidadId?: string | null;
  metodo: string;
  ruta: string;
  estado: number;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registrar(datos: RegistroAuditoria) {
    try {
      await this.prisma.auditoria.create({ data: datos });
    } catch (err) {
      this.logger.warn(`No se pudo registrar auditoría: ${String(err)}`);
    }
  }

  async listar(
    empresaId: string,
    opciones: { pagina: number; limite: number; accion?: string; q?: string },
  ) {
    const where = {
      empresaId,
      ...(opciones.accion
        ? { accion: { contains: opciones.accion, mode: 'insensitive' as const } }
        : {}),
      ...(opciones.q
        ? {
            OR: [
              { usuario: { contains: opciones.q, mode: 'insensitive' as const } },
              { accion: { contains: opciones.q, mode: 'insensitive' as const } },
              { entidad: { contains: opciones.q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [total, datos] = await this.prisma.$transaction([
      this.prisma.auditoria.count({ where }),
      this.prisma.auditoria.findMany({
        where,
        orderBy: { creadoEn: 'desc' },
        skip: (opciones.pagina - 1) * opciones.limite,
        take: opciones.limite,
      }),
    ]);

    return { total, pagina: opciones.pagina, limite: opciones.limite, datos };
  }
}
