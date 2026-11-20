import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditoriaModule } from './auditoria/auditoria.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ComisionistasModule } from './comisionistas/comisionistas.module.js';
import { LiquidacionesModule } from './liquidaciones/liquidaciones.module.js';
import { MetasModule } from './metas/metas.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ReglasModule } from './reglas/reglas.module.js';
import { ResumenModule } from './resumen/resumen.module.js';
import { SucursalesModule } from './sucursales/sucursales.module.js';
import { SuscripcionesModule } from './suscripciones/suscripciones.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';
import { VentasModule } from './ventas/ventas.module.js';

// Módulo principal: aquí se conectan todas las partes de la aplicación.
// Cada módulo agrupa una cosa (ventas, liquidaciones, reglas, etc.) y expone
// sus propias rutas. PrismaModule va primero porque casi todo lo necesita.
@Module({
  imports: [
    // Límite general: 120 peticiones por minuto y por IP. Las rutas
    // sensibles (login, activar) tienen su propio límite más estricto.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
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
    ReglasModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}


