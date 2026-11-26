import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service.js';

export interface UsuarioJwt {
  sub: string;
  email: string;
  empresaId: string;
  rol: string;
  comisionistaId?: string | null;
}

export interface RequestConUsuario extends Request {
  usuario?: UsuarioJwt;
}

// Guardián de las rutas privadas. Revisa el token del encabezado y, además,
// pregunta a la base si la cuenta sigue activa. Así, desactivar a alguien o
// cambiarle el rol surte efecto de inmediato y no hay que esperar a que
// caduque el token.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token');
    }

    let datos: UsuarioJwt;
    try {
      datos = await this.jwt.verifyAsync<UsuarioJwt>(header.slice(7));
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }

    // Se toma el usuario de la base, no del token: el rol y el estado
    // pueden haber cambiado desde que se firmó.
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: datos.sub },
      select: {
        id: true,
        email: true,
        empresaId: true,
        rol: true,
        activo: true,
        comisionistaId: true,
        debeCambiarPassword: true,
        passwordTemporalExpira: true,
      },
    });

    if (!usuario) {
      throw new UnauthorizedException('Token inválido o expirado');
    }
    if (!usuario.activo) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    // Si la clave temporal venció, solo se le deja cambiar la contraseña.
    const esCambioDeClave = request.path.startsWith('/api/auth/cambiar-clave');
    if (
      !esCambioDeClave &&
      usuario.debeCambiarPassword &&
      usuario.passwordTemporalExpira &&
      usuario.passwordTemporalExpira < new Date()
    ) {
      throw new ForbiddenException(
        'Tu clave temporal venció. Pide una nueva al administrador.',
      );
    }

    request.usuario = {
      sub: usuario.id,
      email: usuario.email,
      empresaId: usuario.empresaId,
      rol: usuario.rol,
      comisionistaId: usuario.comisionistaId,
    };
    return true;
  }
}
