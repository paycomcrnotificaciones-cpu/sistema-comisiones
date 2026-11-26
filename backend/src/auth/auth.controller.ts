import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  activarSchema,
  cambiarClaveSchema,
  loginSchema,
  type ActivarInput,
  type CambiarClaveInput,
  type LoginInput,
} from '../common/validators.js';
import { AuthService } from './auth.service.js';
import { EnlacesService } from './enlaces.service.js';
import { JwtAuthGuard, type RequestConUsuario } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly enlaces: EnlacesService,
  ) {}

  // POST /api/auth/login
  // Recibe correo y contraseña, los valida y devuelve el token de acceso.
  // 5 intentos por minuto y por IP: frena la fuerza bruta de contraseñas.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.login(body.email, body.password);
  }

  // POST /api/auth/activar
  // Ruta pública: el usuario llega desde el enlace y define su contraseña.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('activar')
  activar(@Body(new ZodValidationPipe(activarSchema)) body: ActivarInput) {
    return this.enlaces.activar(body.token, body.password);
  }

  // POST /api/auth/cambiar-clave — cambia la contraseña del usuario con sesión.
  @UseGuards(JwtAuthGuard)
  @Post('cambiar-clave')
  cambiarClave(
    @Req() req: RequestConUsuario,
    @Body(new ZodValidationPipe(cambiarClaveSchema)) body: CambiarClaveInput,
  ) {
    return this.authService.cambiarClave(req.usuario!.sub, body.nueva);
  }
}
