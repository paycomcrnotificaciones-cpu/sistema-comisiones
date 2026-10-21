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
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      empresaId: empresa.id,
      email: 'admin@demo.com',
      passwordHash: await hash('Clave1234', 10),
      rol: 'ADMIN',
    },
  });

  console.log('Seed listo: admin@demo.com / Clave1234');
}

await main();
await prisma.$disconnect();
