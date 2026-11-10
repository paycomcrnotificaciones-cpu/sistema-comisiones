-- CreateEnum
CREATE TYPE "EstadoLiquidacion" AS ENUM ('BORRADOR', 'PAGADA');

-- AlterTable
ALTER TABLE "ventas" ADD COLUMN     "liquidacion_id" TEXT;

-- CreateTable
CREATE TABLE "liquidaciones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "comisionista_id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'BORRADOR',
    "comision_total" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "ventas_count" INTEGER NOT NULL DEFAULT 0,
    "nota" TEXT,
    "creada_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pagada_en" TIMESTAMP(3),

    CONSTRAINT "liquidaciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "liquidaciones_empresa_id_periodo_idx" ON "liquidaciones"("empresa_id", "periodo");

-- CreateIndex
CREATE UNIQUE INDEX "liquidaciones_empresa_id_comisionista_id_periodo_key" ON "liquidaciones"("empresa_id", "comisionista_id", "periodo");

-- CreateIndex
CREATE INDEX "ventas_liquidacion_id_idx" ON "ventas"("liquidacion_id");

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liquidaciones" ADD CONSTRAINT "liquidaciones_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
