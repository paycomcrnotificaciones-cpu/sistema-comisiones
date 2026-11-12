import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../generated/prisma/client.js';

// Conexión a PostgreSQL. Se crea una sola vez y se reutiliza en toda la app,
// así no se abre una conexión nueva por cada consulta.
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({ adapter: new PrismaPg(process.env.DATABASE_URL ?? '') });
  }

  // Al arrancar la API se conecta a la base.
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  // Al apagarla cierra la conexión para no dejar procesos colgados.
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
