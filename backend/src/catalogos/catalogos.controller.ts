import {
  Body,
  Controller,
  Delete,
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
  catalogoSchema,
  catalogoUpdateSchema,
  type CatalogoInput,
  type CatalogoUpdateInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { CatalogosService } from './catalogos.service.js';

// Catálogo de productos. Cualquier usuario con sesión puede leerlo
// (lo necesitan los formularios de venta y suscripción).
@Controller('catalogos')
@UseGuards(JwtAuthGuard)
export class CatalogosController {
  constructor(private readonly catalogos: CatalogosService) {}

  // GET /api/catalogos?activos=1 — el catálogo de la empresa.
  @Get()
  listar(@Req() req: RequestConUsuario, @Query('activos') activos?: string) {
    return this.catalogos.listar(
      req.usuario!.empresaId,
      activos === '1' || activos === 'true',
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(catalogoSchema)) body: CatalogoInput,
  ) {
    return this.catalogos.crear(req.usuario!.empresaId, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(catalogoUpdateSchema)) body: CatalogoUpdateInput,
  ) {
    return this.catalogos.actualizar(req.usuario!.empresaId, id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  eliminar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.catalogos.eliminar(req.usuario!.empresaId, id);
  }
}
