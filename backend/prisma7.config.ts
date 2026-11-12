import "dotenv/config";
import { defineConfig } from "prisma/config";

// Configuración de Prisma: dónde está el esquema, dónde se guardan las
// migraciones, qué comando llena los datos de prueba y a qué base conectarse.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
