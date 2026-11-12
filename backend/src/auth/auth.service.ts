import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // Revisa el correo y la contraseña y devuelve un token.
  // El token guarda quién es el usuario, de qué empresa es y qué rol tiene,
  // para no tener que consultar la base en cada pedido.
  async login(email: string, password: string) {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const coincide = await compare(password, usuario.passwordHash);
    if (!coincide) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = {
      sub: usuario.id,
      email: usuario.email,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      comisionistaId: usuario.comisionistaId,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      usuario: {
        id: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        empresaId: usuario.empresaId,
        comisionistaId: usuario.comisionistaId,
      },
    };
  }
}
