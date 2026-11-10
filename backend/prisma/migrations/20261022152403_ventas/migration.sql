-- CreateEnum
CREATE TYPE "EstadoVenta" AS ENUM ('ACTIVA', 'ANULADA');

-- CreateTable
CREATE TABLE "ventas" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "sucursal_id" TEXT NOT NULL,
    "comisionista_id" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "documento" TEXT,
    "cliente" TEXT,
    "producto" TEXT,
    "categoria" TEXT,
    "bruto" DECIMAL(18,4) NOT NULL,
    "neto" DECIMAL(18,4) NOT NULL,
    "costo" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "estado" "EstadoVenta" NOT NULL DEFAULT 'ACTIVA',
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ventas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ventas_empresa_id_fecha_idx" ON "ventas"("empresa_id", "fecha");

-- CreateIndex
CREATE INDEX "ventas_empresa_id_comisionista_id_idx" ON "ventas"("empresa_id", "comisionista_id");

-- CreateIndex
CREATE UNIQUE INDEX "ventas_empresa_id_documento_key" ON "ventas"("empresa_id", "documento");

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "sucursales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
