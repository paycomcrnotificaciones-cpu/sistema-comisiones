import { Controller, Get } from '@nestjs/common';

import { AppService } from './app.service.js';

// Ruta mínima de revisión: GET /api/health.
// La usan los scripts de arranque para saber si la API ya está lista.
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  health() {
    return this.appService.health();
  }
}
