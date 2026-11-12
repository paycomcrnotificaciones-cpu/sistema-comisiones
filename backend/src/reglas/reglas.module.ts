import { Module } from '@nestjs/common';

import { ReglasController } from './reglas.controller.js';
import { ReglasService } from './reglas.service.js';

// Módulo de reglas de comisión y de la sugerencia que usa el formulario de venta.
@Module({
  controllers: [ReglasController],
  providers: [ReglasService],
  exports: [ReglasService],
})
export class ReglasModule {}
