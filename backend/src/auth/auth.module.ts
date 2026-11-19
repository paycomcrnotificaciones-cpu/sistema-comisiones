import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EnlacesService } from './enlaces.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// Configuración del login y de los tokens.
// El token dura 8 horas: pasado ese tiempo hay que volver a entrar.
@Global()
// Módulo de autenticación: login, firma del token y guardianes de acceso.
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? 'dev-secret-cambiar',
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EnlacesService, JwtAuthGuard],
  exports: [AuthService, EnlacesService, JwtAuthGuard],
})
export class AuthModule {}
