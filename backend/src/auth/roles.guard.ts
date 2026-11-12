import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { RequestConUsuario } from './jwt-auth.guard.js';

export const ROLES_KEY = 'roles';

// Se usa junto a @Roles('ADMIN', ...) en los controladores.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

// Revisa el rol del usuario que ya identificó JwtAuthGuard.
// Si la ruta pide un rol y el usuario no lo tiene, responde 403.
// Va después del guardián de sesión: primero se sabe quién es, luego qué puede.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!roles || roles.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    if (!request.usuario || !roles.includes(request.usuario.rol)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
