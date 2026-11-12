import 'dotenv/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module.js';

// Arranca el servidor de la API.
// Todas las rutas llevan /api delante, se aceptan pedidos solo desde la web
// configurada en WEB_ORIGIN y se escucha en el puerto indicado (por defecto 4000).
// HOST permite dejarlo accesible solo en esta computadora (127.0.0.1).
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000, process.env.HOST ?? '0.0.0.0');
}
await bootstrap();
