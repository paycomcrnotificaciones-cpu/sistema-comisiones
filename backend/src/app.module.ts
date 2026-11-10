import { Module } from '@nestjs/common';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ComisionistasModule } from './comisionistas/comisionistas.module.js';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module.js';
import { MetasModule } from './metas/metas.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ResumenModule } from './resumen/resumen.module.js';
import { SucursalesModule } from './sucursales/sucursales.module.js';
import { SuscripcionesModule } from './suscripciones/suscripciones.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { VentasModule } from './ventas/ventas.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    ResumenModule,
    ComisionistasModule,
    LiquidacionesModule,
    SucursalesModule,
    SuscripcionesModule,
    UsuariosModule,
    VentasModule,
    MetasModule,
    AuditoriaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


