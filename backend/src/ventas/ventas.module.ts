import { Module } from '@nestjs/common';

import { VentasController } from './ventas.controller.js';
import { VentasService } from './ventas.service.js';

// Módulo de ventas: registro, edición, anulación y exportación.
@Module({
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
