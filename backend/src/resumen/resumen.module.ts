import { Module } from '@nestjs/common';

import { ResumenController } from './resumen.controller.js';
import { ResumenService } from './resumen.service.js';
import { MetasModule } from '../metas/metas.module.js';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module.js';

// Módulo del resumen del mes (panel con totales, ranking y gráficas).
@Module({
  imports: [SuscripcionesModule, MetasModule],
  controllers: [ResumenController],
  providers: [ResumenService],
})
export class ResumenModule {}
