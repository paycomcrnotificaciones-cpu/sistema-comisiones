import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

import type { RequestConUsuario } from '../auth/jwt-auth.guard.js';
import { AuditoriaService } from './auditoria.service.js';

const MUTACIONES = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function describir(
  metodo: string,
  ruta: string,
): { accion: string; entidad: string } | null {
  const partes = ruta.replace(/^\/?api\/?/, '').split('?')[0].split('/');
  const recurso = partes[0];
  const sub = partes[2];

  if (recurso === 'auth') return null;

  if (recurso === 'ventas') {
    if (sub === 'anular') return { accion: 'Anuló una venta', entidad: 'Venta' };
    if (metodo === 'POST') return { accion: 'Registró una venta', entidad: 'Venta' };
    if (metodo === 'PATCH') return { accion: 'Editó una venta', entidad: 'Venta' };
    return null;
  }

  if (recurso === 'liquidaciones') {
    if (sub === 'pagar') return { accion: 'Pagó una liquidación', entidad: 'Liquidación' };
    if (sub === 'anular') return { accion: 'Anuló una liquidación', entidad: 'Liquidación' };
    if (metodo === 'POST') return { accion: 'Generó una liquidación', entidad: 'Liquidación' };
    return null;
  }

  if (recurso === 'comisionistas') {
    if (metodo === 'POST') return { accion: 'Creó un comisionista', entidad: 'Comisionista' };
    if (metodo === 'PATCH') return { accion: 'Editó un comisionista', entidad: 'Comisionista' };
    return null;
  }

  if (recurso === 'usuarios') {
    if (metodo === 'POST') return { accion: 'Creó un usuario', entidad: 'Usuario' };
    if (metodo === 'PATCH') return { accion: 'Editó un usuario', entidad: 'Usuario' };
    return null;
  }

  if (recurso === 'reglas') {
    if (metodo === 'POST') return { accion: 'Creó una regla', entidad: 'Regla' };
    if (metodo === 'PATCH') return { accion: 'Editó una regla', entidad: 'Regla' };
    if (metodo === 'DELETE') return { accion: 'Eliminó una regla', entidad: 'Regla' };
    return null;
  }

  if (recurso === 'metas') {
    return { accion: 'Fijó una meta', entidad: 'Meta' };
  }

  if (recurso === 'suscripciones') {
    if (metodo === 'POST') return { accion: 'Creó una suscripción', entidad: 'Suscripción' };
    if (metodo === 'PATCH') return { accion: 'Editó una suscripción', entidad: 'Suscripción' };
    return null;
  }

  return {
    accion: `${metodo} ${recurso ?? 'recurso'}`,
    entidad: recurso ?? 'Sistema',
  };
}

@Injectable()
export class AuditoriaInterceptor implements NestInterceptor {
  constructor(private readonly auditoria: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<
      RequestConUsuario & { method: string; originalUrl: string; params: Record<string, string> }
    >();
    const metodo = req.method.toUpperCase();

    if (!MUTACIONES.has(metodo)) return next.handle();

    const descripcion = describir(metodo, req.originalUrl);
    if (!descripcion) return next.handle();

    const guardar = (estado: number) => {
      const usuario = req.usuario;
      if (!usuario) return;
      void this.auditoria.registrar({
        empresaId: usuario.empresaId,
        usuarioId: usuario.sub ?? null,
        usuario: usuario.email ?? 'desconocido',
        rol: usuario.rol ?? null,
        accion: descripcion.accion,
        entidad: descripcion.entidad,
        entidadId: req.params?.id ?? null,
        metodo,
        ruta: req.originalUrl.split('?')[0],
        estado,
      });
    };

    return next.handle().pipe(
      tap(() => guardar(200)),
      catchError((err: { status?: number }) => {
        guardar(err?.status ?? 500);
        return throwError(() => err);
      }),
    );
  }
}
