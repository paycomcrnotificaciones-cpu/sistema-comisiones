import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard, type RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { ResumenService } from './resumen.service.js';

@Controller('resumen')
@UseGuards(JwtAuthGuard)
export class ResumenController {
  constructor(private readonly resumen: ResumenService) {}

  @Get()
  obtener(
    @Req() req: RequestConUsuario,
    @Query('mes') mes?: string,
  ) {
    if (mes && !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) {
      throw new BadRequestException('El mes debe tener el formato YYYY-MM');
    }
    const usuario = req.usuario!;
    return this.resumen.obtener(
      usuario.empresaId,
      mes,
      usuario.rol === 'COMISIONISTA' ? usuario.comisionistaId : undefined,
    );
  }
}
