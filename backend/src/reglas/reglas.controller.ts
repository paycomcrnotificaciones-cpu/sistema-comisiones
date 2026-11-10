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

@Controller('reglas')
@UseGuards(JwtAuthGuard)
export class ReglasController {
  constructor(private readonly reglas: ReglasService) {}

  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.reglas.listar(req.usuario!.empresaId);
  }

  @Get('sugerir')
  sugerir(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(reglaSugerirSchema)) query: ReglaSugerirInput,
  ) {
    return this.reglas.sugerir(req.usuario!.empresaId, query);
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

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  eliminar(@Req() req: RequestConUsuario, @Param('id') id: string) {
    return this.reglas.eliminar(req.usuario!.empresaId, id);
  }
}
