import { Module } from '@nestjs/common';

import { MetasController } from './metas.controller.js';
import { MetasService } from './metas.service.js';

// Módulo de metas mensuales, generales o por comisionista.
@Module({
  controllers: [MetasController],
  providers: [MetasService],
  exports: [MetasService],
})
export class MetasModule {}
