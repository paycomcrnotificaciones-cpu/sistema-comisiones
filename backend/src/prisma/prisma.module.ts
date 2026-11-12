import { Global, Module } from '@nestjs/common';

import { PrismaService } from './prisma.service.js';

@Global()
// Módulo de base de datos. Deja la conexión disponible para todos los demás.
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
