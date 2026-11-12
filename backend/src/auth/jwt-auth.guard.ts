import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

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

// Guardián de las rutas privadas. Antes de dejar pasar un pedido revisa que
// venga el token en el encabezado (Authorization: Bearer ...), lo valida y
// guarda los datos del usuario en la petición para que el controlador los use.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el token');
    }
    try {
      request.usuario = await this.jwt.verifyAsync<UsuarioJwt>(header.slice(7));
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }
}
