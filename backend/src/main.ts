import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

// Orígenes que pueden llamar a la API. Se pueden separar con comas para
// tener, por ejemplo, producción y pruebas al mismo tiempo.
function origenesPermitidos(): string[] {
  return (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
}

// Arranca el servidor de la API.
// Todas las rutas llevan /api delante y solo se aceptan pedidos desde la web
// configurada en WEB_ORIGIN. HOST permite dejarlo accesible solo en esta
// computadora (127.0.0.1).
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');

  const origenes = origenesPermitidos();
  if (origenes.length === 0) {
    // En producción no se adivina: si falta, mejor fallar al arrancar que
    // dejar la API aceptando cualquier origen.
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Falta WEB_ORIGIN. Indica la dirección de la web (por ejemplo https://mi-app.netlify.app).',
      );
    }
    origenes.push('http://localhost:3000');
  }

  app.enableCors({
    origin: origenes,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cabeceras de seguridad (nosniff, sin iframes, etc.).
  // La política CSP no aplica aquí porque la API solo devuelve JSON.
  app.use(helmet({ contentSecurityPolicy: false }));

  // En Render la API va detrás de un proxy: sin esto el límite de intentos
  // vería la IP del proxy y no la del visitante.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000, process.env.HOST ?? '0.0.0.0');
}
await bootstrap();
