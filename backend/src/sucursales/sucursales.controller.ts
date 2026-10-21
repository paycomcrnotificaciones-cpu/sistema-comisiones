import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import type { RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('sucursales')
@UseGuards(JwtAuthGuard)
export class SucursalesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar(@Req() req: RequestConUsuario) {
    return this.prisma.sucursal.findMany({
      where: { empresaId: req.usuario!.empresaId },
      orderBy: { nombre: 'asc' },
    });
  }
}
