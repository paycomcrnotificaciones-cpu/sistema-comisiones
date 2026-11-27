import 'dotenv/config';
import { hash } from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Deja la base limpia: una empresa y un super admin con clave temporal.
// Uso: ADMIN_EMAIL=... ADMIN_CLAVE=123456 pnpm exec tsx scripts/crear-admin.ts
async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'paycomcr.notificaciones@gmail.com';
  const clave = process.env.ADMIN_CLAVE ?? String(Math.floor(100000 + Math.random() * 900000));

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  let empresa = await prisma.empresa.findFirst();
  if (!empresa) {
    empresa = await prisma.empresa.create({ data: { nombre: 'PayCom CR' } });
  }

  await prisma.usuario.upsert({
    where: { email },
    update: {
      passwordHash: await hash(clave, 10),
      rol: 'SUPER_ADMIN',
      activo: true,
      debeCambiarPassword: true,
      passwordTemporalExpira: new Date(Date.now() + 7 * 24 * 3_600_000),
    },
    create: {
      empresaId: empresa.id,
      email,
      passwordHash: await hash(clave, 10),
      rol: 'SUPER_ADMIN',
      activo: true,
      debeCambiarPassword: true,
      passwordTemporalExpira: new Date(Date.now() + 7 * 24 * 3_600_000),
    },
  });

  console.log(JSON.stringify({
    empresa: empresa.nombre,
    usuarios: await prisma.usuario.count(),
    email,
    claveTemporal: clave,
  }));
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
