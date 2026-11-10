-- CreateEnum
CREATE TYPE "Frecuencia" AS ENUM ('MENSUAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL', 'UNICA');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVA', 'PAUSADA', 'FINALIZADA');

-- AlterTable
ALTER TABLE "liquidaciones" ADD COLUMN     "comisiones_count" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "suscripciones" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "comisionista_id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "producto" TEXT,
    "monto" DECIMAL(18,4) NOT NULL,
    "frecuencia_cobro" "Frecuencia" NOT NULL,
    "comision_tipo" "TipoComision" NOT NULL DEFAULT 'PORCENTAJE',
    "comision_valor" DECIMAL(18,4) NOT NULL,
    "comision_frecuencia" "Frecuencia" NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fin" TIMESTAMP(3),
    "estado" "EstadoSuscripcion" NOT NULL DEFAULT 'ACTIVA',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comisiones_suscripcion" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "suscripcion_id" TEXT NOT NULL,
    "comisionista_id" TEXT NOT NULL,
    "periodo" TEXT NOT NULL,
    "base" DECIMAL(18,4) NOT NULL,
    "monto" DECIMAL(18,4) NOT NULL,
    "liquidacion_id" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comisiones_suscripcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "suscripciones_empresa_id_estado_idx" ON "suscripciones"("empresa_id", "estado");

-- CreateIndex
CREATE INDEX "suscripciones_empresa_id_comisionista_id_idx" ON "suscripciones"("empresa_id", "comisionista_id");

-- CreateIndex
CREATE INDEX "comisiones_suscripcion_empresa_id_periodo_idx" ON "comisiones_suscripcion"("empresa_id", "periodo");

-- CreateIndex
CREATE INDEX "comisiones_suscripcion_liquidacion_id_idx" ON "comisiones_suscripcion"("liquidacion_id");

-- CreateIndex
CREATE UNIQUE INDEX "comisiones_suscripcion_suscripcion_id_periodo_key" ON "comisiones_suscripcion"("suscripcion_id", "periodo");

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones_suscripcion" ADD CONSTRAINT "comisiones_suscripcion_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones_suscripcion" ADD CONSTRAINT "comisiones_suscripcion_suscripcion_id_fkey" FOREIGN KEY ("suscripcion_id") REFERENCES "suscripciones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones_suscripcion" ADD CONSTRAINT "comisiones_suscripcion_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comisiones_suscripcion" ADD CONSTRAINT "comisiones_suscripcion_liquidacion_id_fkey" FOREIGN KEY ("liquidacion_id") REFERENCES "liquidaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
