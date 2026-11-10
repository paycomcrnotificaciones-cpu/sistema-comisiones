import { Module } from '@nestjs/common';

import { ResumenController } from './resumen.controller.js';
import { ResumenService } from './resumen.service.js';
import { SuscripcionesModule } from '../suscripciones/suscripciones.module.js';

@Module({
  imports: [SuscripcionesModule],
  controllers: [ResumenController],
  providers: [ResumenService],
})
export class ResumenModule {}
