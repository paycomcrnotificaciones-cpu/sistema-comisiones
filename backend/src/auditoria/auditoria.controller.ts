import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { Roles, RolesGuard } from '../auth/roles.guard.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { AuditoriaService } from './auditoria.service.js';

const auditoriaQuerySchema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(30),
  accion: z.string().trim().max(80).optional(),
  q: z.string().trim().max(100).optional(),
});

type AuditoriaQuery = z.infer<typeof auditoriaQuerySchema>;

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
export class AuditoriaController {
  constructor(private readonly auditoria: AuditoriaService) {}

  @Get()
  listar(
    @Req() req: RequestConUsuario,
    @Query(new ZodValidationPipe(auditoriaQuerySchema)) query: AuditoriaQuery,
  ) {
    return this.auditoria.listar(req.usuario!.empresaId, query);
  }
}
