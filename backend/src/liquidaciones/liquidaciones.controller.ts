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
  liquidacionPagarSchema,
  liquidacionQuerySchema,
  type LiquidacionCreateInput,
  type LiquidacionPagarInput,
  type LiquidacionQueryInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { LiquidacionesService } from './liquidaciones.service.js';

// Rutas de liquidaciones. Crear, pagar y anular es solo para ADMIN y
// SUPER_ADMIN; consultar lo puede hacer cualquier usuario con token.
@Controller('liquidaciones')
@UseGuards(JwtAuthGuard)
export class LiquidacionesController {
  constructor(private readonly liquidaciones: LiquidacionesService) {}

  // GET /api/liquidaciones — listado por mes y estado.
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

  // GET /api/liquidaciones/:id — detalle con ventas y comisiones incluidas.
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

  // POST /api/liquidaciones/:id/pagar — marca como pagada.
  @Post(':id/pagar')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  pagar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(liquidacionPagarSchema))
    body: LiquidacionPagarInput,
  ) {
    return this.liquidaciones.pagar(req.usuario!.empresaId, id, body);
  }

  // POST /api/liquidaciones/:id/anular — deshace una liquidación sin pagar.
  @Post(':id/anular')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  anular(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.liquidaciones.anular(req.usuario!.empresaId, id);
  }
}
