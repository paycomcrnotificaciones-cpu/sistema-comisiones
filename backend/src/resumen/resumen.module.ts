import { Module } from '@nestjs/common';

import { ResumenController } from './resumen.controller.js';
import { ResumenService } from './resumen.service.js';
import { MetasModule } from '../metas/metas.module.js';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module.js';

@Module({
  imports: [SuscripcionesModule, MetasModule],
  controllers: [ResumenController],
  providers: [ResumenService],
})
export class ResumenModule {}
