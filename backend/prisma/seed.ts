import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL ?? ''),
});

async function main() {
  let empresa = await prisma.empresa.findFirst({ where: { nombre: 'Demo' } });
  empresa ??= await prisma.empresa.create({ data: { nombre: 'Demo' } });

  let sucursal = await prisma.sucursal.findFirst({
    where: { empresaId: empresa.id, codigo: 'PRINCIPAL' },
  });
  sucursal ??= await prisma.sucursal.create({
    data: {
      empresaId: empresa.id,
      nombre: 'Principal',
      codigo: 'PRINCIPAL',
    },
  });

  await prisma.moneda.upsert({
    where: { empresaId_codigo: { empresaId: empresa.id, codigo: 'CRC' } },
    update: {},
    create: {
      empresaId: empresa.id,
      codigo: 'CRC',
      nombre: 'Colón costarricense',
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'super@demo.com' },
    update: { rol: 'SUPER_ADMIN' },
    create: {
      empresaId: empresa.id,
      email: 'super@demo.com',
      passwordHash: await hash('Clave1234', 10),
      rol: 'SUPER_ADMIN',
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'supervisor@demo.com' },
    update: { rol: 'SUPERVISOR' },
    create: {
      empresaId: empresa.id,
      email: 'supervisor@demo.com',
      passwordHash: await hash('Clave1234', 10),
      rol: 'SUPERVISOR',
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      email: 'admin@demo.com',
      passwordHash: await hash('Clave1234', 10),
      rol: 'ADMIN',
    },
  });

  let comisionista = await prisma.comisionista.findFirst({
    where: { empresaId: empresa.id, nombre: 'Laura Méndez' },
  });
  comisionista ??= await prisma.comisionista.create({
    data: {
      empresaId: empresa.id,
      sucursalId: sucursal.id,
      nombre: 'Laura Méndez',
      codigo: 'C-100',
    },
  });

  await prisma.usuario.upsert({
    where: { email: 'laura@demo.com' },
    update: { comisionistaId: comisionista.id },
    create: {
      empresaId: empresa.id,
      email: 'laura@demo.com',
      passwordHash: await hash('Clave1234', 10),
      rol: 'COMISIONISTA',
      comisionistaId: comisionista.id,
    },
  });

  const hoyCR = new Date(Date.now() - 6 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const fechaDemo = new Date(`${hoyCR}T06:00:00Z`);

  const ventasDemo = [
    {
      documento: 'DEMO-001',
      producto: 'Cámara de seguridad',
      cliente: 'Cliente Demo',
      neto: '20000',
      comisionTipo: 'PORCENTAJE' as const,
      comisionValor: '5',
      comisionMonto: '1000',
    },
    {
      documento: 'DEMO-002',
      producto: 'Instalación',
      cliente: 'Cliente Demo',
      neto: '10000',
      comisionTipo: 'MONTO_FIJO' as const,
      comisionValor: '300',
      comisionMonto: '300',
    },
    {
      documento: 'DEMO-003',
      producto: 'Mantenimiento',
      cliente: 'Cliente Demo',
      neto: '15000',
      comisionTipo: 'PORCENTAJE' as const,
      comisionValor: '4',
      comisionMonto: '600',
    },
  ];

  for (const venta of ventasDemo) {
    await prisma.venta.upsert({
      where: {
        empresaId_documento: {
          empresaId: empresa.id,
          documento: venta.documento,
        },
      },
      update: {
        fecha: fechaDemo,
        comisionistaId: comisionista.id,
        neto: venta.neto,
        bruto: venta.neto,
        comisionTipo: venta.comisionTipo,
        comisionValor: venta.comisionValor,
        comisionMonto: venta.comisionMonto,
        estado: 'ACTIVA',
        liquidacionId: null,
      },
      create: {
        empresaId: empresa.id,
        sucursalId: sucursal.id,
        comisionistaId: comisionista.id,
        fecha: fechaDemo,
        documento: venta.documento,
        cliente: venta.cliente,
        producto: venta.producto,
        bruto: venta.neto,
        neto: venta.neto,
        costo: '0',
        comisionTipo: venta.comisionTipo,
        comisionValor: venta.comisionValor,
        comisionMonto: venta.comisionMonto,
      },
    });
  }

  const inicioMes = new Date(
    Date.UTC(
      Number(hoyCR.slice(0, 4)),
      Number(hoyCR.slice(5, 7)) - 1,
      1,
      6,
    ),
  );

  const suscripcionDemo = await prisma.suscripcion.findFirst({
    where: { empresaId: empresa.id, cliente: 'Restaurante La Esquina' },
  });
  if (suscripcionDemo) {
    await prisma.suscripcion.update({
      where: { id: suscripcionDemo.id },
      data: {
        comisionistaId: comisionista.id,
        producto: 'Factelec',
        monto: '30000',
        frecuenciaCobro: 'MENSUAL',
        comisionTipo: 'PORCENTAJE',
        comisionValor: '10',
        comisionFrecuencia: 'MENSUAL',
        inicio: inicioMes,
        fin: null,
        estado: 'ACTIVA',
      },
    });
  } else {
    await prisma.suscripcion.create({
      data: {
        empresaId: empresa.id,
        comisionistaId: comisionista.id,
        cliente: 'Restaurante La Esquina',
        producto: 'Factelec',
        monto: '30000',
        frecuenciaCobro: 'MENSUAL',
        comisionTipo: 'PORCENTAJE',
        comisionValor: '10',
        comisionFrecuencia: 'MENSUAL',
        inicio: inicioMes,
      },
    });
  }

  console.log(
    'Seed listo: super@demo.com · admin@demo.com · supervisor@demo.com · laura@demo.com (Clave1234)',
  );
}

await main();
await prisma.$disconnect();
