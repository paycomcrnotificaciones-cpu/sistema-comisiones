-- Quita los conceptos de sucursal y meta: el cliente ya no los usa.
-- Las reglas que estaban atadas a una sucursal pasan a ser globales.

-- DropForeignKey
ALTER TABLE "comisionistas" DROP CONSTRAINT "comisionistas_sucursal_id_fkey";

-- DropForeignKey
ALTER TABLE "ventas" DROP CONSTRAINT "ventas_sucursal_id_fkey";

-- DropForeignKey
ALTER TABLE "reglas_comision" DROP CONSTRAINT "reglas_comision_sucursal_id_fkey";

-- DropIndex
DROP INDEX "comisionistas_sucursal_id_idx";

-- DropIndex
DROP INDEX "sucursales_empresa_id_idx";

-- DropIndex
DROP INDEX "metas_empresa_id_periodo_idx";

-- AlterTable
ALTER TABLE "comisionistas" DROP COLUMN "sucursal_id";

-- AlterTable
ALTER TABLE "ventas" DROP COLUMN "sucursal_id";

-- AlterTable
ALTER TABLE "reglas_comision" DROP COLUMN "sucursal_id";

-- Las reglas de sucursal se conservan como reglas globales.
UPDATE "reglas_comision" SET "ambito" = 'GLOBAL' WHERE "ambito" = 'SUCURSAL';

-- AlterEnum: PostgreSQL no permite quitar un valor, se recrea el tipo.
ALTER TYPE "AmbitoRegla" RENAME TO "AmbitoRegla_old";

-- CreateEnum
CREATE TYPE "AmbitoRegla" AS ENUM ('GLOBAL', 'PRODUCTO', 'COMISIONISTA');

-- AlterTable
ALTER TABLE "reglas_comision" ALTER COLUMN "ambito" DROP DEFAULT;
ALTER TABLE "reglas_comision" ALTER COLUMN "ambito" TYPE "AmbitoRegla" USING ("ambito"::text::"AmbitoRegla");
ALTER TABLE "reglas_comision" ALTER COLUMN "ambito" SET DEFAULT 'GLOBAL';

-- DropEnum
DROP TYPE "AmbitoRegla_old";

-- DropTable
DROP TABLE "metas";

-- DropTable
DROP TABLE "sucursales";
