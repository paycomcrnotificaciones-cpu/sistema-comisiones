import { Test, TestingModule } from '@nestjs/testing';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma/prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: PrismaService, useValue: { $queryRaw: async () => [{ '?column?': 1 }] } },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('reporta salud de la base de datos', async () => {
    await expect(appController.health()).resolves.toEqual({ status: 'ok', db: 'ok' });
  });
});
