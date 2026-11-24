import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { hash } from 'bcryptjs';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Pruebas de integración contra la base comisiones_test.
// Los datos se crean una sola vez en beforeAll y las pruebas solo leen
// o agregan lo suyo, para no depender del orden entre casos.

const CLAVE = 'ClaveDePrueba123';

let app: INestApplication<App>;
let prisma: PrismaService;
const ids: Record<string, string> = {};
const tokens: Record<string, string> = {};

function api() {
  return request(app.getHttpServer());
}

async function login(email: string, password = CLAVE): Promise<string> {
  const res = await api().post('/api/auth/login').send({ email, password });
  expect(res.status).toBe(201);
  return res.body.accessToken as string;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    // El límite de intentos estorbaría en las pruebas.
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  prisma = app.get(PrismaService);

  // Base limpia, en orden por las claves foráneas.
  await prisma.tokenAcceso.deleteMany();
  await prisma.auditoria.deleteMany();
  await prisma.comisionSuscripcion.deleteMany();
  await prisma.liquidacion.deleteMany();
  await prisma.venta.deleteMany();
  await prisma.suscripcion.deleteMany();
  await prisma.reglaComision.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.comisionista.deleteMany();
  await prisma.empresa.deleteMany();

  const empresaA = await prisma.empresa.create({ data: { nombre: 'Empresa A' } });
  const empresaB = await prisma.empresa.create({ data: { nombre: 'Empresa B' } });
  ids.empresaA = empresaA.id;
  ids.empresaB = empresaB.id;

  const comiA = await prisma.comisionista.create({
    data: { empresaId: empresaA.id, nombre: 'Ana A' },
  });
  const comiB = await prisma.comisionista.create({
    data: { empresaId: empresaB.id, nombre: 'Bruno B' },
  });
  ids.comisionistaA = comiA.id;
  ids.comisionistaB = comiB.id;

  const passwordHash = await hash(CLAVE, 10);
  const crearUsuario = (email: string, rol: string, empresaId: string, comisionistaId?: string) =>
    prisma.usuario.create({
      data: {
        empresaId,
        email,
        passwordHash,
        rol: rol as never,
        ...(comisionistaId ? { comisionistaId } : {}),
      },
    });

  await crearUsuario('super@test.com', 'SUPER_ADMIN', empresaA.id);
  await crearUsuario('admin@test.com', 'ADMIN', empresaA.id);
  await crearUsuario('supervisor@test.com', 'SUPERVISOR', empresaA.id);
  ids.usuarioComisionista = (
    await crearUsuario('comi@test.com', 'COMISIONISTA', empresaA.id, comiA.id)
  ).id;
  await crearUsuario('adminb@test.com', 'ADMIN', empresaB.id);

  tokens.super = await login('super@test.com');
  tokens.admin = await login('admin@test.com');
  tokens.supervisor = await login('supervisor@test.com');
  tokens.comisionista = await login('comi@test.com');
  tokens.adminB = await login('adminb@test.com');
});

afterAll(async () => {
  await app?.close();
});

describe('Autenticación', () => {
  it('rechaza una contraseña incorrecta', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('rechaza un correo que no existe', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'nadie@test.com', password: CLAVE });
    expect(res.status).toBe(401);
  });

  it('exige token en las rutas privadas', async () => {
    const res = await api().get('/api/comisionistas');
    expect(res.status).toBe(401);
  });

  it('rechaza un token inventado', async () => {
    const res = await api()
      .get('/api/comisionistas')
      .set('Authorization', 'Bearer no.es.un.token');
    expect(res.status).toBe(401);
  });

  it('corta la sesión en cuanto se desactiva la cuenta', async () => {
    await prisma.usuario.update({
      where: { id: ids.usuarioComisionista },
      data: { activo: false },
    });
    const res = await api()
      .get('/api/comisionistas')
      .set('Authorization', `Bearer ${tokens.comisionista}`);
    expect(res.status).toBe(401);

    await prisma.usuario.update({
      where: { id: ids.usuarioComisionista },
      data: { activo: true },
    });
  });
});

describe('Permisos por rol', () => {
  it('solo los administradores ven la lista de usuarios', async () => {
    expect(
      (await api().get('/api/usuarios').set('Authorization', `Bearer ${tokens.super}`)).status,
    ).toBe(200);
    expect(
      (await api().get('/api/usuarios').set('Authorization', `Bearer ${tokens.supervisor}`)).status,
    ).toBe(403);
    expect(
      (await api().get('/api/usuarios').set('Authorization', `Bearer ${tokens.comisionista}`)).status,
    ).toBe(403);
  });

  it('el supervisor no puede registrar ventas', async () => {
    const res = await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.supervisor}`)
      .send({
        fecha: '2026-03-02',
        comisionistaId: ids.comisionistaA,
        bruto: '100',
        neto: '100',
        comisionValor: '10',
      });
    expect(res.status).toBe(403);
  });

  it('el supervisor no ve el historial de auditoría', async () => {
    const res = await api()
      .get('/api/auditoria')
      .set('Authorization', `Bearer ${tokens.supervisor}`);
    expect(res.status).toBe(403);
  });

  it('el comisionista solo ve sus propios perfiles', async () => {
    const res = await api()
      .get('/api/comisionistas')
      .set('Authorization', `Bearer ${tokens.comisionista}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(ids.comisionistaA);
  });

  it('el comisionista no puede abrir el perfil de otro', async () => {
    const res = await api()
      .get(`/api/comisionistas/${ids.comisionistaB}`)
      .set('Authorization', `Bearer ${tokens.comisionista}`);
    expect(res.status).toBe(403);
  });
});

describe('Aislamiento entre empresas', () => {
  it('no mezcla comisionistas de otra empresa', async () => {
    const res = await api()
      .get('/api/comisionistas')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(200);
    expect(res.body.map((c: { nombre: string }) => c.nombre)).toEqual(['Ana A']);
  });

  it('no deja ver un comisionista ajeno por id', async () => {
    const res = await api()
      .get(`/api/comisionistas/${ids.comisionistaB}`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(404);
  });

  it('no deja crear una venta con un comisionista ajeno', async () => {
    const res = await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        fecha: '2026-03-03',
        comisionistaId: ids.comisionistaB,
        bruto: '100',
        neto: '100',
        comisionValor: '10',
      });
    expect([400, 404]).toContain(res.status);
  });
});

describe('Ventas y cálculo de comisión', () => {
  it('calcula el porcentaje con 4 decimales exactos', async () => {
    const res = await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        fecha: '2026-03-05',
        comisionistaId: ids.comisionistaA,
        producto: 'Producto de prueba',
        bruto: '1300',
        neto: '1234.5678',
        comisionTipo: 'PORCENTAJE',
        comisionValor: '10',
      });
    expect(res.status).toBe(201);
    expect(Number(res.body.comisionMonto)).toBeCloseTo(123.4568, 4);
  });

  it('usa el monto fijo cuando la comisión no es porcentaje', async () => {
    const res = await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        fecha: '2026-03-06',
        comisionistaId: ids.comisionistaA,
        bruto: '500',
        neto: '500',
        comisionTipo: 'MONTO_FIJO',
        comisionValor: '35.75',
      });
    expect(res.status).toBe(201);
    expect(Number(res.body.comisionMonto)).toBe(35.75);
  });

  it('rechaza un neto mayor que el bruto', async () => {
    const res = await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        fecha: '2026-03-07',
        comisionistaId: ids.comisionistaA,
        bruto: '100',
        neto: '150',
        comisionValor: '10',
      });
    expect(res.status).toBe(400);
  });

  it('rechaza un porcentaje de comisión mayor a 100', async () => {
    const res = await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        fecha: '2026-03-08',
        comisionistaId: ids.comisionistaA,
        bruto: '100',
        neto: '100',
        comisionTipo: 'PORCENTAJE',
        comisionValor: '150',
      });
    expect(res.status).toBe(400);
  });
});

describe('Liquidaciones', () => {
  let liquidacionId = '';

  it('crea el borrador sumando las ventas pendientes', async () => {
    const res = await api()
      .post('/api/liquidaciones')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ comisionistaId: ids.comisionistaA, mes: '2026-03' });
    expect(res.status).toBe(201);
    // 123.4568 + 35.7500
    expect(Number(res.body.comisionTotal)).toBeCloseTo(159.2068, 4);
    liquidacionId = res.body.id;
  });

  it('no permite dos borradores del mismo mes', async () => {
    const res = await api()
      .post('/api/liquidaciones')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ comisionistaId: ids.comisionistaA, mes: '2026-03' });
    expect(res.status).toBe(409);
  });

  it('marca como pagada y no deja pagarla dos veces', async () => {
    const pago = { metodoPago: 'EFECTIVO' };
    const primera = await api()
      .post(`/api/liquidaciones/${liquidacionId}/pagar`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(pago);
    expect(primera.status).toBe(201);

    const segunda = await api()
      .post(`/api/liquidaciones/${liquidacionId}/pagar`)
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send(pago);
    expect(segunda.status).toBe(400);
  });

  it('no deja anular una liquidación ya pagada', async () => {
    const res = await api()
      .post(`/api/liquidaciones/${liquidacionId}/anular`)
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(400);
  });
});

describe('Invitaciones y contraseñas', () => {
  const correo = 'nuevo@test.com';

  it('crea el usuario sin contraseña y devuelve un enlace', async () => {
    const res = await api()
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ email: correo, rol: 'SUPERVISOR' });
    expect(res.status).toBe(201);
    expect(res.body.enlaceInvitacion).toContain('/activar/');
    tokens.enlace = res.body.enlaceInvitacion as string;
  });

  it('no deja entrar antes de activar la cuenta', async () => {
    const res = await api()
      .post('/api/auth/login')
      .send({ email: correo, password: CLAVE });
    expect(res.status).toBe(401);
  });

  it('activa la cuenta con el enlace y permite entrar', async () => {
    const token = tokens.enlace.split('/activar/')[1];
    const activar = await api()
      .post('/api/auth/activar')
      .send({ token, password: 'NuevaClaveSegura123' });
    expect(activar.status).toBe(201);

    const entrar = await api()
      .post('/api/auth/login')
      .send({ email: correo, password: 'NuevaClaveSegura123' });
    expect(entrar.status).toBe(201);
  });

  it('no deja reutilizar el enlace', async () => {
    const token = tokens.enlace.split('/activar/')[1];
    const res = await api()
      .post('/api/auth/activar')
      .send({ token, password: 'OtraClaveDistinta123' });
    expect(res.status).toBe(400);
  });

  it('rechaza una contraseña corta al activar', async () => {
    const res = await api()
      .post('/api/auth/activar')
      .send({ token: 'x'.repeat(43), password: 'corta' });
    expect(res.status).toBe(400);
  });
});

describe('Generación en lote', () => {
  it('solo lista a quien tiene algo por liquidar', async () => {
    await api()
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({
        fecha: '2026-05-10',
        comisionistaId: ids.comisionistaA,
        bruto: '200',
        neto: '200',
        comisionValor: '10',
      })
      .expect(201);

    const res = await api()
      .get('/api/liquidaciones/pendientes?mes=2026-05')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(200);
    expect(res.body.pendientes).toEqual([{ comisionistaId: ids.comisionistaA }]);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
  });

  it('no incluye a quien ya tiene liquidación del mes', async () => {
    await api()
      .post('/api/liquidaciones')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ comisionistaId: ids.comisionistaA, mes: '2026-05' })
      .expect(201);

    const res = await api()
      .get('/api/liquidaciones/pendientes?mes=2026-05')
      .set('Authorization', `Bearer ${tokens.admin}`);
    expect(res.status).toBe(200);
    expect(res.body.pendientes).toEqual([]);
    expect(res.body.yaTienen).toBeGreaterThanOrEqual(1);
  });

  it('es solo para administradores', async () => {
    const res = await api()
      .get('/api/liquidaciones/pendientes?mes=2026-05')
      .set('Authorization', `Bearer ${tokens.supervisor}`);
    expect(res.status).toBe(403);
  });

  it('crear sin nada pendiente responde 409 y no 400', async () => {
    const res = await api()
      .post('/api/liquidaciones')
      .set('Authorization', `Bearer ${tokens.admin}`)
      .send({ comisionistaId: ids.comisionistaA, mes: '2026-07' });
    expect(res.status).toBe(409);
  });
});
