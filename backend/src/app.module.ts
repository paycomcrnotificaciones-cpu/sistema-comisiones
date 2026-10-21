import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ComisionistasModule } from './comisionistas/comisionistas.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SucursalesModule } from './sucursales/sucursales.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ComisionistasModule,
    SucursalesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
