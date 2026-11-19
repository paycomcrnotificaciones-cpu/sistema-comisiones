import { BadRequestException, Injectable } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { PrismaService } from '../prisma/prisma.service.js';

const HORAS_VIGENCIA = 48;

// Sirve tanto para el servicio normal como para una transacción abierta.
type ClienteTokens = Pick<PrismaService, 'tokenAcceso'>;

// Enlaces de un solo uso para que cada persona cree su propia contraseña.
// El administrador genera el enlace, pero nunca ve ni elige la contraseña:
// en la base solo queda el hash del token y el hash de la clave.
@Injectable()
export class EnlacesService {
  constructor(private readonly prisma: PrismaService) {}

  // Crea un enlace nuevo y devuelve la dirección completa una sola vez.
  // El enlace anterior, si seguía sin usar, queda anulado.
  async crear(
    usuarioId: string,
    tipo: 'INVITACION' | 'RESETEO' = 'INVITACION',
  ) {
    return this.generar(this.prisma, usuarioId, tipo);
  }

  // Igual que crear(), pero dentro de una transacción ya abierta.
  // Se usa cuando el usuario se acaba de crear y todavía no está confirmado.
  crearEnTransaccion(
    db: ClienteTokens,
    usuarioId: string,
    tipo: 'INVITACION' | 'RESETEO' = 'INVITACION',
  ) {
    return this.generar(db, usuarioId, tipo);
  }

  private async generar(
    db: ClienteTokens,
    usuarioId: string,
    tipo: 'INVITACION' | 'RESETEO',
  ) {
    const token = randomBytes(32).toString('base64url');
    const expiraEn = new Date(Date.now() + HORAS_VIGENCIA * 3_600_000);

    await db.tokenAcceso.updateMany({
      where: { usuarioId, usadoEn: null },
      data: { usadoEn: new Date() },
    });
    await db.tokenAcceso.create({
      data: { usuarioId, tokenHash: this.hashear(token), tipo, expiraEn },
    });

    const base = (process.env.WEB_ORIGIN ?? 'http://localhost:3100').replace(
      /\/$/,
      '',
    );
    return { enlace: `${base}/activar/${token}`, expiraEn };
  }

  // Revisa el token y guarda la contraseña elegida por la persona.
  // Devuelve el correo para que el frontend pueda confirmar de quién es.
  async activar(token: string, password: string) {
    const registro = await this.prisma.tokenAcceso.findUnique({
      where: { tokenHash: this.hashear(token) },
      include: {
        usuario: { select: { id: true, email: true, activo: true } },
      },
    });

    if (!registro || registro.usadoEn) {
      throw new BadRequestException(
        'Este enlace ya se usó. Pide uno nuevo al administrador.',
      );
    }
    if (registro.expiraEn < new Date()) {
      throw new BadRequestException(
        'Este enlace venció. Pide uno nuevo al administrador.',
      );
    }
    if (!registro.usuario.activo) {
      throw new BadRequestException('El usuario está desactivado.');
    }

    const passwordHash = await hash(password, 10);
    await this.prisma.$transaction([
      this.prisma.usuario.update({
        where: { id: registro.usuarioId },
        data: { passwordHash },
      }),
      this.prisma.tokenAcceso.update({
        where: { id: registro.id },
        data: { usadoEn: new Date() },
      }),
    ]);

    return { email: registro.usuario.email };
  }

  // Contraseña aleatoria e inservible para los usuarios nuevos: mientras no
  // activen su enlace, nadie puede entrar con esa cuenta.
  passwordProvisional(): Promise<string> {
    return hash(randomUUID(), 10);
  }

  // Guarda en la base solo el hash del token, nunca el token en claro.
  private hashear(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
