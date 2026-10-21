import { Module } from '@nestjs/common';

import { ComisionistasController } from './comisionistas.controller.js';
import { ComisionistasService } from './comisionistas.service.js';

@Module({
  controllers: [ComisionistasController],
  providers: [ComisionistasService],
})
export class ComisionistasModule {}
