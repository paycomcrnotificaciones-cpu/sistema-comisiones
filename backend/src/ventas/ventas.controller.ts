import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';

import type { Response } from 'express';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import {
  ventaCreateSchema,
  ventaQuerySchema,
  ventaUpdateSchema,
  type VentaCreateInput,
  type VentaQueryInput,
  type VentaUpdateInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { VentasService } from './ventas.service.js';

@Controller('ventas')
@UseGuards(JwtAuthGuard)
export class VentasController {
  constructor(private readonly ventas: VentasService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(ventaQuerySchema)) query: VentaQueryInput,
  ) {
    const usuario = req.usuario!;
    return this.ventas.listar(
      usuario.empresaId,
      query,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
  }

  @Get('export')
  async exportar(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(ventaQuerySchema)) query: VentaQueryInput,
    @Res() res: Response,
  ) {
    const usuario = req.usuario!;
    const csv = await this.ventas.exportar(
      usuario.empresaId,
      query,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="ventas-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.send(csv);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(ventaCreateSchema)) body: VentaCreateInput,
  ) {
    const usuario = req.usuario!;
    if (usuario.rol === 'COMISIONISTA') {
      throw new ForbiddenException('El comisionista no puede registrar ventas');
    }
    return this.ventas.crear(usuario.empresaId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ventaUpdateSchema)) body: VentaUpdateInput,
  ) {
    const usuario = req.usuario!;
    if (usuario.rol === 'COMISIONISTA') {
      throw new ForbiddenException('El comisionista no puede editar ventas');
    }
    return this.ventas.actualizar(usuario.empresaId, id, body);
  }

  @Post(':id/anular')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  anular(@Req() req: RequestConUsuario, @Param('id') id: string) {
    const usuario = req.usuario!;
    if (usuario.rol === 'COMISIONISTA') {
      throw new ForbiddenException('El comisionista no puede anular ventas');
    }
    return this.ventas.anular(usuario.empresaId, id);
  }
}
