import { Module } from '@nestjs/common';

import { ComisionistasController } from './comisionistas.controller.js';
import { ComisionistasService } from './comisionistas.service.js';

// Módulo de comisionistas: alta, edición, perfil y su acceso al sistema.
@Module({
  controllers: [ComisionistasController],
  providers: [ComisionistasService],
})
export class ComisionistasModule {}
