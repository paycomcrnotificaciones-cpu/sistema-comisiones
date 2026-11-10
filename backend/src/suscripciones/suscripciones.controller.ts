import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  suscripcionCreateSchema,
  suscripcionQuerySchema,
  suscripcionUpdateSchema,
  type SuscripcionCreateInput,
  type SuscripcionQueryInput,
  type SuscripcionUpdateInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SuscripcionesService } from './suscripciones.service.js';

@Controller('suscripciones')
@UseGuards(JwtAuthGuard)
export class SuscripcionesController {
  constructor(private readonly suscripciones: SuscripcionesService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(suscripcionQuerySchema))
    query: SuscripcionQueryInput,
  ) {
    const usuario = req.usuario!;
    return this.suscripciones.listar(
      usuario.empresaId,
      query,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
  }

  @Get(':id')
  obtener(@Req() req: RequestConUsuario, @Param('id') id: string) {
    const usuario = req.usuario!;
    return this.suscripciones.obtener(usuario.empresaId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(suscripcionCreateSchema))
    body: SuscripcionCreateInput,
  ) {
    return this.suscripciones.crear(req.usuario!.empresaId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(suscripcionUpdateSchema))
    body: SuscripcionUpdateInput,
  ) {
    return this.suscripciones.actualizar(
      req.usuario!.empresaId,
      id,
      body,
    );
  }

  @Post(':id/pausar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  pausar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.suscripciones.cambiarEstado(
      req.usuario!.empresaId,
      id,
      'PAUSADA',
    );
  }

  @Post(':id/finalizar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  finalizar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.suscripciones.cambiarEstado(
      req.usuario!.empresaId,
      id,
      'FINALIZADA',
    );
  }

  @Post(':id/reactivar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  reactivar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.suscripciones.cambiarEstado(
      req.usuario!.empresaId,
      id,
      'ACTIVA',
    );
  }
}
