import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Borra todo el historial y deja solo la empresa y un administrador.
// Uso: CONSERVAR=admin@demo.com pnpm exec tsx scripts/limpiar-datos.ts
const CONSERVAR = process.env.CONSERVAR ?? 'admin@demo.com';

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });

  const admin = await prisma.usuario.findUnique({ where: { email: CONSERVAR } });
  if (!admin) {
    throw new Error(`No existe el usuario a conservar: ${CONSERVAR}`);
  }

  const antes = {
    ventas: await prisma.venta.count(),
    suscripciones: await prisma.suscripcion.count(),
    comisionesSuscripcion: await prisma.comisionSuscripcion.count(),
    liquidaciones: await prisma.liquidacion.count(),
    comisionistas: await prisma.comisionista.count(),
    usuarios: await prisma.usuario.count(),
    catalogos: await prisma.catalogo.count(),
    auditoria: await prisma.auditoria.count(),
  };

  await prisma.$transaction([
    prisma.comisionSuscripcion.deleteMany(),
    prisma.venta.deleteMany(),
    prisma.liquidacion.deleteMany(),
    prisma.suscripcion.deleteMany(),
    prisma.comisionista.deleteMany(),
    prisma.tokenAcceso.deleteMany(),
    prisma.usuario.deleteMany({ where: { id: { not: admin.id } } }),
    prisma.catalogo.deleteMany(),
    prisma.auditoria.deleteMany(),
    prisma.moneda.deleteMany(),
  ]);

  console.log('Antes:', antes);
  console.log('Queda:', {
    usuarios: await prisma.usuario.count(),
    empresas: await prisma.empresa.count(),
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
