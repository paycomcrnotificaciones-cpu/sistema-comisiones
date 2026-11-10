import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  liquidacionCreateSchema,
  liquidacionQuerySchema,
  type LiquidacionCreateInput,
  type LiquidacionQueryInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { LiquidacionesService } from './liquidaciones.service.js';

@Controller('liquidaciones')
@UseGuards(JwtAuthGuard)
export class LiquidacionesController {
  constructor(private readonly liquidaciones: LiquidacionesService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(liquidacionQuerySchema))
    query: LiquidacionQueryInput,
  ) {
    const usuario = req.usuario!;
    return this.liquidaciones.listar(
      usuario.empresaId,
      query,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
  }

  @Get(':id')
  obtener(@Req() req: RequestConUsuario, @Param('id') id: string) {
    const usuario = req.usuario!;
    return this.liquidaciones.obtener(
      usuario.empresaId,
      id,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(liquidacionCreateSchema))
    body: LiquidacionCreateInput,
  ) {
    return this.liquidaciones.crear(req.usuario!.empresaId, body);
  }

  @Post(':id/pagar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  pagar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.liquidaciones.pagar(req.usuario!.empresaId, id);
  }

  @Post(':id/anular')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  anular(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.liquidaciones.anular(req.usuario!.empresaId, id);
  }
}
