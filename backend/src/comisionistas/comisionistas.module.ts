import { Module } from '@nestjs/common';

import { ComisionistasController } from './comisionistas.controller.js';
import { CorreoModule } from '../correo/correo.module.js';
import { ComisionistasService } from './comisionistas.service.js';

// Módulo de comisionistas: alta, edición, perfil y su acceso al sistema.
@Module({
  imports: [CorreoModule],
  controllers: [ComisionistasController],
  providers: [ComisionistasService],
})
export class ComisionistasModule {}
