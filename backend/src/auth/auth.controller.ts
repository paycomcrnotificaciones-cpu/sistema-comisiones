import { Body, Controller, Post } from '@nestjs/common';

import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { loginSchema, type LoginInput } from '../common/validators.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/auth/login
  // Recibe correo y contraseña, los valida y devuelve el token de acceso.
  @Post('login')
  login(@Body(new ZodValidationPipe(loginSchema)) body: LoginInput) {
    return this.authService.login(body.email, body.password);
  }
}
