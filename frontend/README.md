# PayCom CR

Web del sistema de comisiones.

<!-- deploy proxy api -->

## Correo

La API de Render no puede usar los puertos SMTP. El envío lo hace una función
de Netlify (`netlify/functions/enviar-correo.mjs`) y la API la llama por HTTPS.

Variables en Netlify: `CORREO_SECRET`, `SMTP_HOST`, `SMTP_PORT`,
`SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` y `SMTP_FROM`.
En Render: `CORREO_RELAY_URL` y `CORREO_RELAY_SECRET`.
