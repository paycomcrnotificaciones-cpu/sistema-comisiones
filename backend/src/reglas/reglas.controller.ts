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
  reglaComisionSchema,
  reglaComisionUpdateSchema,
  reglaSugerirSchema,
  type ReglaComisionInput,
  type ReglaComisionUpdateInput,
  type ReglaSugerirInput,
} from '../common/validators.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { ReglasService } from './reglas.service.js';

// Rutas de reglas de comisión. La sugerencia la puede pedir cualquiera
// (la usa el formulario de venta); crear, editar y borrar es solo de admin.
@Controller('reglas')
@UseGuards(JwtAuthGuard)
export class ReglasController {
  constructor(private readonly reglas: ReglasService) {}

  // GET /api/reglas — todas las reglas de la empresa.
  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.reglas.listar(req.usuario!.empresaId);
  }

  // GET /api/reglas/sugerir — la regla que mejor calza con una venta.
  @Get('sugerir')
  sugerir(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(reglaSugerirSchema)) query: ReglaSugerirInput,
  ) {
    return this.reglas.sugerir(req.usuario!.empresaId, query);
  }

  // GET /api/reglas/productos — productos que ya existen en ventas o reglas.
  @Get('productos')
  productos(@Req() req: RequestConUsuario) {
    return this.reglas.productos(req.usuario!.empresaId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(reglaComisionSchema)) body: ReglaComisionInput,
  ) {
    return this.reglas.crear(req.usuario!.empresaId, body);
  }

  // PATCH /api/reglas/:id — actualiza una regla (solo admin).
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  actualizar(
    @Req() req: RequestConUsuario,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(reglaComisionUpdateSchema))
    body: ReglaComisionUpdateInput,
  ) {
    return this.reglas.actualizar(req.usuario!.empresaId, id, body);
  }

  // DELETE /api/reglas/:id — borra una regla (solo admin).
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  eliminar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.reglas.eliminar(req.usuario!.empresaId, id);
  }
}
