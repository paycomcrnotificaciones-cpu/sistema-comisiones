import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

// Envío de correos por SMTP (Gmail). Si no hay credenciales configuradas,
// el sistema sigue funcionando: devuelve enviado=false y el administrador
// entrega el enlace y la clave a mano.
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private transporte: Transporter | null = null;

  private obtenerTransporte(): Transporter | null {
    if (this.transporte) return this.transporte;

    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass) return null;

    this.transporte = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: { user, pass },
    });
    return this.transporte;
  }

  get configurado(): boolean {
    return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
  }

  // Envía la invitación con el enlace y la clave temporal.
  async enviarInvitacion(datos: {
    para: string;
    enlace: string;
    claveTemporal: string;
    nombreEmpresa?: string;
  }): Promise<{ enviado: boolean; motivo?: string }> {
    const transporte = this.obtenerTransporte();
    if (!transporte) {
      return { enviado: false, motivo: 'SMTP sin configurar' };
    }

    const remitente = process.env.SMTP_FROM ?? process.env.SMTP_USER!;
    const empresa = datos.nombreEmpresa ?? 'PayCom CR';

    try {
      await transporte.sendMail({
        from: `"${empresa}" <${remitente}>`,
        to: datos.para,
        subject: `${empresa} · Acceso al sistema`,
        text: [
          `Hola.`,
          ``,
          `Ya tienes acceso a ${empresa}.`,
          ``,
          `Clave temporal: ${datos.claveTemporal}`,
          `Debes cambiarla antes de 7 días; después la cuenta se bloquea.`,
          ``,
          `También puedes crear tu contraseña con este enlace (vence en 48 horas y sirve una sola vez):`,
          datos.enlace,
          ``,
          `Si no esperabas este correo, ignóralo.`,
        ].join('\n'),
        html: `
          <p>Hola.</p>
          <p>Ya tienes acceso a <strong>${empresa}</strong>.</p>
          <p><strong>Clave temporal:</strong> ${datos.claveTemporal}<br/>
          Debes cambiarla antes de 7 días; después la cuenta se bloquea.</p>
          <p>También puedes crear tu contraseña con este enlace (vence en 48 horas y sirve una sola vez):<br/>
          <a href="${datos.enlace}">${datos.enlace}</a></p>
          <p>Si no esperabas este correo, ignóralo.</p>
        `,
      });
      return { enviado: true };
    } catch (error) {
      this.logger.warn(`No se pudo enviar el correo: ${String(error)}`);
      return { enviado: false, motivo: 'No se pudo enviar el correo' };
    }
  }
}
