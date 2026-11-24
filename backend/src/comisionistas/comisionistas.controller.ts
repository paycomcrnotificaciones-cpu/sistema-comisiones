import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  comisionistaCreateSchema,
  comisionistaUpdateSchema,
  type ComisionistaCreateInput,
  type ComisionistaUpdateInput,
} from '../common/validators.js';
import { ComisionistasService } from './comisionistas.service.js';

// Rutas de comisionistas. Cualquiera con token puede consultar;
// crear y editar es solo para ADMIN y SUPER_ADMIN.
@Controller('comisionistas')
@UseGuards(JwtAuthGuard)
export class ComisionistasController {
  constructor(private readonly comisionistasService: ComisionistasService) {}

  @Get()
  // GET /api/comisionistas — el comisionista solo se ve a sí mismo.
  listar(@Req() req: RequestConUsuario) {
    const usuario = req.usuario!;
    const soloId =
      usuario.rol === 'COMISIONISTA'
        ? (usuario.comisionistaId ?? '00000000-0000-0000-0000-000000000000')
        : undefined;
    return this.comisionistasService.listar(usuario.empresaId, soloId);
  }

  @Get(':id')
  // GET /api/comisionistas/:id — perfil con sus datos y su usuario.
  obtener(@Req() req: RequestConUsuario, @Param('id') id: string) {
    const usuario = req.usuario!;
    if (usuario.rol === 'COMISIONISTA' && usuario.comisionistaId !== id) {
      throw new ForbiddenException('No puedes ver otro perfil');
    }
    return this.comisionistasService.obtener(usuario.empresaId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(comisionistaCreateSchema))
    body: ComisionistaCreateInput,
  ) {
    if (req.usuario!.rol === 'COMISIONISTA') {
      throw new ForbiddenException('El comisionista no puede crear perfiles');
    }
    return this.comisionistasService.crear(req.usuario!.empresaId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(comisionistaUpdateSchema))
    body: ComisionistaUpdateInput,
  ) {
    if (req.usuario!.rol === 'COMISIONISTA') {
      throw new ForbiddenException('El comisionista no puede editar perfiles');
    }
    return this.comisionistasService.actualizar(
      req.usuario!.empresaId,
      id,
      body,
    );
  }
}
