import { Module } from '@nestjs/common';

import { SucursalesController } from './sucursales.controller.js';
import { SucursalesService } from './sucursales.service.js';

// Módulo de sucursales (puntos de venta).
@Module({
  controllers: [SucursalesController],
  providers: [SucursalesService],
})
export class SucursalesModule {}
