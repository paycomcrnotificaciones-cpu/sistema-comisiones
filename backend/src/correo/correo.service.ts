import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';

// Envío de correos por SMTP (Gmail). Si no hay credenciales configuradas,
// el sistema sigue funcionando: devuelve enviado=false y el administrador
// entrega el enlace y la clave a mano.
@Injectable()
export class CorreoService {
  private readonly logger = new Logger(CorreoService.name);
  private transporte: Transporter | null = null;
  // Si el SMTP falla (Render bloquea los puertos de salida), se recuerda un
  // rato para no hacer esperar a cada invitación.
  private smtpFalloEn = 0;
  private smtpAvisado = false;
  private readonly REINTENTO_SMTP_MS = 10 * 60 * 1000;

  private get remitente(): string {
    return process.env.SMTP_FROM ?? process.env.SMTP_USER ?? '';
  }

  // Brevo se llama por HTTPS: es el camino que funciona en Render.
  private get brevoConfigurado(): boolean {
    return Boolean(process.env.BREVO_API_KEY && this.remitente);
  }

  private get smtpConfigurado(): boolean {
    return Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS,
    );
  }

  private obtenerTransporte(): Transporter | null {
    if (this.transporte) return this.transporte;
    if (!this.smtpConfigurado) return null;

    // Tiempos cortos: si los puertos SMTP están bloqueados, mejor fallar en
    // segundos que dejar la petición colgada dos minutos.
    this.transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: process.env.SMTP_SECURE !== 'false',
      auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
      connectionTimeout: 8_000,
      greetingTimeout: 8_000,
      socketTimeout: 12_000,
    });
    return this.transporte;
  }

  get configurado(): boolean {
    return this.brevoConfigurado || this.smtpConfigurado;
  }

  // Envía la invitación con el enlace y la clave temporal.
  async enviarInvitacion(datos: {
    para: string;
    enlace: string;
    claveTemporal: string;
    nombreEmpresa?: string;
  }): Promise<{ enviado: boolean; motivo?: string }> {
    const empresa = datos.nombreEmpresa ?? 'PayCom CR';
    const asunto = `${empresa} · Acceso al sistema`;
    const texto = [
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
    ].join('\n');
    const html = `
      <p>Hola.</p>
      <p>Ya tienes acceso a <strong>${empresa}</strong>.</p>
      <p><strong>Clave temporal:</strong> ${datos.claveTemporal}<br/>
      Debes cambiarla antes de 7 días; después la cuenta se bloquea.</p>
      <p>También puedes crear tu contraseña con este enlace (vence en 48 horas y sirve una sola vez):<br/>
      <a href="${datos.enlace}">${datos.enlace}</a></p>
      <p>Si no esperabas este correo, ignóralo.</p>
    `;

    return this.entregar({ para: datos.para, asunto, texto, html, empresa });
  }

  // Primer camino: Brevo por HTTPS (no lo bloquea Render).
  private async porBrevo(m: {
    para: string;
    asunto: string;
    texto: string;
    html: string;
    empresa: string;
  }): Promise<boolean> {
    try {
      const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY!,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { name: m.empresa, email: this.remitente },
          to: [{ email: m.para }],
          subject: m.asunto,
          textContent: m.texto,
          htmlContent: m.html,
        }),
        signal: AbortSignal.timeout(12_000),
      });

      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '');
        this.logger.warn(
          `Brevo respondió ${respuesta.status}: ${detalle.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`No se pudo enviar por Brevo: ${String(error)}`);
      return false;
    }
  }

  // Camino alterno: una función de Netlify hace el envío SMTP. Sirve para
  // servidores que bloquean los puertos de correo, como Render.
  private get relayConfigurado(): boolean {
    return Boolean(process.env.CORREO_RELAY_URL && process.env.CORREO_RELAY_SECRET);
  }

  private async porRelay(m: {
    para: string;
    asunto: string;
    texto: string;
    html: string;
    empresa: string;
  }): Promise<boolean> {
    try {
      const respuesta = await fetch(process.env.CORREO_RELAY_URL!, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-correo-secret': process.env.CORREO_RELAY_SECRET!,
        },
        body: JSON.stringify(m),
        signal: AbortSignal.timeout(20_000),
      });
      if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '');
        this.logger.warn(
          `El relay de correo respondió ${respuesta.status}: ${detalle.slice(0, 200)}`,
        );
        return false;
      }
      return true;
    } catch (error) {
      this.logger.warn(`No se pudo enviar por el relay: ${String(error)}`);
      return false;
    }
  }

  // Segundo camino: SMTP directo. En Render está bloqueado, así que se
  // recuerda el fallo y se deja de intentar por unos minutos.
  private async porSmtp(m: {
    para: string;
    asunto: string;
    texto: string;
    html: string;
    empresa: string;
  }): Promise<boolean> {
    if (
      this.smtpFalloEn > 0 &&
      Date.now() - this.smtpFalloEn < this.REINTENTO_SMTP_MS
    ) {
      return false;
    }
    const transporte = this.obtenerTransporte();
    if (!transporte) return false;

    try {
      await transporte.sendMail({
        from: `"${m.empresa}" <${this.remitente}>`,
        to: m.para,
        subject: m.asunto,
        text: m.texto,
        html: m.html,
      });
      this.smtpFalloEn = 0;
      return true;
    } catch (error) {
      this.smtpFalloEn = Date.now();
      if (!this.smtpAvisado) {
        this.smtpAvisado = true;
        this.logger.warn(`No se pudo enviar por SMTP: ${String(error)}`);
      }
      return false;
    }
  }

  // Intenta los caminos disponibles en orden y responde si alguno funcionó.
  private async entregar(m: {
    para: string;
    asunto: string;
    texto: string;
    html: string;
    empresa: string;
  }): Promise<{ enviado: boolean; motivo?: string }> {
    if (this.brevoConfigurado && (await this.porBrevo(m))) {
      return { enviado: true };
    }
    if (this.relayConfigurado && (await this.porRelay(m))) {
      return { enviado: true };
    }
    if (this.smtpConfigurado && (await this.porSmtp(m))) {
      return { enviado: true };
    }
    return {
      enviado: false,
      motivo: this.configurado
        ? 'No se pudo enviar el correo'
        : 'Correo sin configurar',
    };
  }
}
