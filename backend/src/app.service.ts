import { Injectable } from '@nestjs/common';

import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  // Revisión rápida de que el servidor y la base de datos responden.
  // La usa iniciar.sh para saber si la API terminó de levantar.
  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', db: 'ok' };
  }
}
