import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';

import type { RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  comisionistaCreateSchema,
  type ComisionistaCreateInput,
} from '../common/validators.js';
import { ComisionistasService } from './comisionistas.service.js';

@Controller('comisionistas')
@UseGuards(JwtAuthGuard)
export class ComisionistasController {
  constructor(private readonly comisionistasService: ComisionistasService) {}

  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.comisionistasService.listar(req.usuario!.empresaId);
  }

  @Post()
  crear(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(comisionistaCreateSchema))
    body: ComisionistaCreateInput,
  ) {
    return this.comisionistasService.crear(req.usuario!.empresaId, body);
  }
}
