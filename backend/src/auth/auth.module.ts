import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EnlacesService } from './enlaces.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

// La clave con la que se firman los tokens. En producción es obligatoria:
// si falta, la API no arranca. Antes había un valor por defecto y eso
// permitía falsificar tokens si la variable se olvidaba en el servidor.
function secretoJwt(): string {
  const secreto = process.env.JWT_SECRET?.trim();
  if (secreto) {
    if (process.env.NODE_ENV === 'production' && secreto.length < 32) {
      console.warn(
        '[auth] JWT_SECRET es corto. Usa al menos 32 caracteres en producción.',
      );
    }
    return secreto;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Falta JWT_SECRET. La API no arranca sin una clave de firma en producción.',
    );
  }
  return 'dev-secret-cambiar';
}

// Configuración del login y de los tokens.
// El token dura 8 horas: pasado ese tiempo hay que volver a entrar.
@Global()
// Módulo de autenticación: login, firma del token y guardianes de acceso.
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: secretoJwt(),
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EnlacesService, JwtAuthGuard],
  exports: [AuthService, EnlacesService, JwtAuthGuard],
})
export class AuthModule {}
