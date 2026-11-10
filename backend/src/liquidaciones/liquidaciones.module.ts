import { Module } from '@nestjs/common';

import { LiquidacionesController } from './liquidaciones.controller.js';
import { LiquidacionesService } from './liquidaciones.service.js';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module.js';

@Module({
  imports: [SuscripcionesModule],
  controllers: [LiquidacionesController],
  providers: [LiquidacionesService],
})
export class LiquidacionesModule {}
