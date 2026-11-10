import { Body, Controller, Get, Put, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  metaQuerySchema,
  metaUpsertSchema,
  type MetaQueryInput,
  type MetaUpsertInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { MetasService } from './metas.service.js';

@Controller('metas')
@UseGuards(JwtAuthGuard)
export class MetasController {
  constructor(private readonly metas: MetasService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(metaQuerySchema)) query: MetaQueryInput,
  ) {
    const usuario = req.usuario!;
    return this.metas.listar(
      usuario.empresaId,
      query.mes,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  fijar(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(metaUpsertSchema)) body: MetaUpsertInput,
  ) {
    return this.metas.fijar(req.usuario!.empresaId, body);
  }
}
