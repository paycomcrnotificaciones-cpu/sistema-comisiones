/*
  Warnings:

  - You are about to drop the `reglas_comision` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `reglas_comision_rangos` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoComision" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- DropForeignKey
ALTER TABLE "reglas_comision" DROP CONSTRAINT "reglas_comision_comisionista_id_fkey";

-- DropForeignKey
ALTER TABLE "reglas_comision" DROP CONSTRAINT "reglas_comision_empresa_id_fkey";

-- DropForeignKey
ALTER TABLE "reglas_comision_rangos" DROP CONSTRAINT "reglas_comision_rangos_regla_id_fkey";

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "comision_monto" DECIMAL(18,4) NOT NULL DEFAULT 0,
ADD COLUMN     "comision_tipo" "TipoComision" NOT NULL DEFAULT 'PORCENTAJE',
ADD COLUMN     "comision_valor" DECIMAL(18,4) NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "reglas_comision";

-- DropTable
DROP TABLE "reglas_comision_rangos";

-- DropEnum
DROP TYPE "Ambito";

-- DropEnum
DROP TYPE "BaseCalculo";

-- DropEnum
DROP TYPE "TipoRegla";

-- DropEnum
DROP TYPE "TipoValorRango";
