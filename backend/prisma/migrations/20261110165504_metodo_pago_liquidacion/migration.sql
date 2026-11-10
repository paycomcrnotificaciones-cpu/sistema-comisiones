-- CreateEnum
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'SINPE', 'TRANSFERENCIA', 'OTRO');

-- AlterTable
ALTER TABLE "liquidaciones" ADD COLUMN     "metodo_pago" "MetodoPago";
