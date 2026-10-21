import { Module } from '@nestjs/common';

import { SucursalesController } from './sucursales.controller.js';

@Module({
  controllers: [SucursalesController],
})
export class SucursalesModule {}
