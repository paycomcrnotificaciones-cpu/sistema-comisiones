-- CreateEnum
CREATE TYPE "TipoRegla" AS ENUM ('PORCENTAJE', 'MONTO_FIJO', 'ESCALONADO');

-- CreateEnum
CREATE TYPE "BaseCalculo" AS ENUM ('BRUTO', 'NETO', 'UTILIDAD');

-- CreateEnum
CREATE TYPE "Ambito" AS ENUM ('GLOBAL', 'COMISIONISTA', 'PRODUCTO', 'CATEGORIA');

-- CreateEnum
CREATE TYPE "TipoValorRango" AS ENUM ('PORCENTAJE', 'MONTO_FIJO');

-- CreateTable
CREATE TABLE "reglas_comision" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoRegla" NOT NULL,
    "base_calculo" "BaseCalculo" NOT NULL,
    "valor" DECIMAL(18,4),
    "ambito" "Ambito" NOT NULL DEFAULT 'GLOBAL',
    "comisionista_id" TEXT,
    "producto" TEXT,
    "categoria" TEXT,
    "prioridad" INTEGER NOT NULL DEFAULT 100,
    "acumulable" BOOLEAN NOT NULL DEFAULT false,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "vigencia_desde" TIMESTAMP(3),
    "vigencia_hasta" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_comision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reglas_comision_rangos" (
    "id" TEXT NOT NULL,
    "regla_id" TEXT NOT NULL,
    "desde" DECIMAL(18,4) NOT NULL,
    "hasta" DECIMAL(18,4),
    "tipo_valor" "TipoValorRango" NOT NULL,
    "valor" DECIMAL(18,4) NOT NULL,

    CONSTRAINT "reglas_comision_rangos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reglas_comision_empresa_id_idx" ON "reglas_comision"("empresa_id");

-- CreateIndex
CREATE INDEX "reglas_comision_empresa_id_activa_idx" ON "reglas_comision"("empresa_id", "activa");

-- CreateIndex
CREATE INDEX "reglas_comision_empresa_id_ambito_idx" ON "reglas_comision"("empresa_id", "ambito");

-- CreateIndex
CREATE INDEX "reglas_comision_empresa_id_comisionista_id_idx" ON "reglas_comision"("empresa_id", "comisionista_id");

-- CreateIndex
CREATE INDEX "reglas_comision_rangos_regla_id_idx" ON "reglas_comision_rangos"("regla_id");

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_comision_rangos" ADD CONSTRAINT "reglas_comision_rangos_regla_id_fkey" FOREIGN KEY ("regla_id") REFERENCES "reglas_comision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
