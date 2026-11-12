import { Module } from '@nestjs/common';

import { ComisionesSuscripcionService } from './comisiones-suscripcion.service.js';
import { SuscripcionesController } from './suscripciones.controller.js';
import { SuscripcionesService } from './suscripciones.service.js';

// Módulo de suscripciones y de las comisiones que generan mes a mes.
@Module({
  controllers: [SuscripcionesController],
  providers: [SuscripcionesService, ComisionesSuscripcionService],
  exports: [ComisionesSuscripcionService],
})
export class SuscripcionesModule {}
