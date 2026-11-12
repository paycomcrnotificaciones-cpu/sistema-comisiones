import { Module } from '@nestjs/common';

import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';

// Módulo de usuarios y roles de acceso.
@Module({
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
