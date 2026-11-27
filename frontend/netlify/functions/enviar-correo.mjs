// Envía correos por SMTP desde Netlify. Hace falta porque Render bloquea
// los puertos de salida SMTP (25, 465 y 587): la API le pide a esta función
// que entregue el mensaje.
//
// Variables de entorno en Netlify:
//   CORREO_SECRET  clave compartida con la API (obligatoria)
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM
import nodemailer from "nodemailer";

let transporte = null;

function obtenerTransporte() {
  if (transporte) return transporte;
  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  transporte = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 465),
    secure: process.env.SMTP_SECURE !== "false",
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    connectionTimeout: 8_000,
    greetingTimeout: 8_000,
    socketTimeout: 12_000,
  });
  return transporte;
}

const json = (status, cuerpo) => ({
  statusCode: status,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(cuerpo),
});

export async function handler(evento) {
  if (evento.httpMethod !== "POST") {
    return json(405, { error: "Método no permitido" });
  }

  const secreto = evento.headers["x-correo-secret"] ?? evento.headers["X-Correo-Secret"];
  if (!process.env.CORREO_SECRET || secreto !== process.env.CORREO_SECRET) {
    return json(401, { error: "No autorizado" });
  }

  let datos;
  try {
    datos = JSON.parse(evento.body ?? "{}");
  } catch {
    return json(400, { error: "Cuerpo inválido" });
  }

  const para = String(datos.para ?? "").trim();
  const asunto = String(datos.asunto ?? "").trim();
  if (!para || !asunto) {
    return json(400, { error: "Falta el destinatario o el asunto" });
  }

  const transporte = obtenerTransporte();
  if (!transporte) {
    return json(500, { error: "SMTP sin configurar en Netlify" });
  }

  const empresa = datos.empresa ?? "PayCom CR";
  const remitente = process.env.SMTP_FROM ?? process.env.SMTP_USER;

  try {
    await transporte.sendMail({
      from: `"${empresa}" <${remitente}>`,
      to: para,
      subject: asunto,
      text: datos.texto ?? "",
      html: datos.html ?? undefined,
    });
    return json(200, { enviado: true });
  } catch (error) {
    return json(502, { error: String(error).slice(0, 300) });
  }
}
