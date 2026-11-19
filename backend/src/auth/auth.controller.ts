import { Body, Controller, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import {
  activarSchema,
  loginSchema,
  type ActivarInput,
  type LoginInput,
} from '../common/validators.js';
import { AuthService } from './auth.service.js';
import { EnlacesService } from './enlaces.service.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly enlaces: EnlacesService,
  ) {}

  // POST /api/auth/login
  // Recibe correo y contraseña, los valida y devuelve el token de acceso.
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.login(body.email, body.password);
  }

  // POST /api/auth/activar
  // Ruta pública: el usuario llega desde el enlace y define su contraseña.
  @Post('activar')
  activar(@Body(new ZodValidationPipe(activarSchema)) body: ActivarInput) {
    return this.enlaces.activar(body.token, body.password);
  }
}
