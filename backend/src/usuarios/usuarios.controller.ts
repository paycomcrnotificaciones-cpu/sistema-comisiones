import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  usuarioCreateSchema,
  usuarioUpdateSchema,
  type UsuarioCreateInput,
  type UsuarioUpdateInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { UsuariosService } from './usuarios.service.js';

// Rutas de usuarios. Todo este controlador es solo para ADMIN y SUPER_ADMIN.
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class UsuariosController {
  constructor(private readonly usuarios: UsuariosService) {}

  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.usuarios.listar(req.usuario!.empresaId);
  }

  @Post()
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(usuarioCreateSchema)) body: UsuarioCreateInput,
  ) {
    const usuario = req.usuario!;
    return this.usuarios.crear(usuario.empresaId, usuario, body);
  }

  @Patch(':id')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(usuarioUpdateSchema)) body: UsuarioUpdateInput,
  ) {
    const usuario = req.usuario!;
    return this.usuarios.actualizar(usuario.empresaId, usuario, id, body);
  }
}
