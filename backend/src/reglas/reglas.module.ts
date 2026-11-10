import { Module } from '@nestjs/common';

import { ReglasController } from './reglas.controller.js';
import { ReglasService } from './reglas.service.js';

@Module({
  controllers: [ReglasController],
  providers: [ReglasService],
  exports: [ReglasService],
})
export class ReglasModule {}
