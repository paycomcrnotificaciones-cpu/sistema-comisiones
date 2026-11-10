-- CreateEnum
CREATE TYPE "AmbitoRegla" AS ENUM ('GLOBAL', 'PRODUCTO', 'COMISIONISTA', 'SUCURSAL');

-- CreateTable
CREATE TABLE "reglas_comision" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "tipo" "TipoComision" NOT NULL,
    "valor" DECIMAL(18,4) NOT NULL,
    "ambito" "AmbitoRegla" NOT NULL DEFAULT 'GLOBAL',
    "producto" TEXT,
    "comisionista_id" TEXT,
    "sucursal_id" TEXT,
    "prioridad" INTEGER NOT NULL DEFAULT 100,
    "acumulable" BOOLEAN NOT NULL DEFAULT false,
    "vigencia_desde" TIMESTAMP(3),
    "vigencia_hasta" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reglas_comision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reglas_comision_empresa_id_ambito_idx" ON "reglas_comision"("empresa_id", "ambito");

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reglas_comision" ADD CONSTRAINT "reglas_comision_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE CASCADE ON UPDATE CASCADE;
