import {
  Body,
  Controller,
  Delete,
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
  sucursalCreateSchema,
  sucursalUpdateSchema,
  type SucursalCreateInput,
  type SucursalUpdateInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { SucursalesService } from './sucursales.service.js';

@Controller('sucursales')
@UseGuards(JwtAuthGuard)
export class SucursalesController {
  constructor(private readonly sucursales: SucursalesService) {}

  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.sucursales.listar(req.usuario!.empresaId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(sucursalCreateSchema)) body: SucursalCreateInput,
  ) {
    return this.sucursales.crear(req.usuario!.empresaId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(sucursalUpdateSchema)) body: SucursalUpdateInput,
  ) {
    return this.sucursales.actualizar(req.usuario!.empresaId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  eliminar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.sucursales.eliminar(req.usuario!.empresaId, id);
  }
}
