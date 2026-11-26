-- Catálogo de productos: reemplaza a las reglas de comisión.
CREATE TABLE "catalogos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalogos_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalogos_empresa_id_nombre_key" ON "catalogos"("empresa_id", "nombre");
CREATE INDEX "catalogos_empresa_id_activo_idx" ON "catalogos"("empresa_id", "activo");

ALTER TABLE "catalogos" ADD CONSTRAINT "catalogos_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Vínculo con ventas y suscripciones.
ALTER TABLE "ventas" ADD COLUMN "catalogo_id" TEXT;
ALTER TABLE "suscripciones" ADD COLUMN "catalogo_id" TEXT;
CREATE INDEX "ventas_catalogo_id_idx" ON "ventas"("catalogo_id");
CREATE INDEX "suscripciones_catalogo_id_idx" ON "suscripciones"("catalogo_id");
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_catalogo_id_fkey"
    FOREIGN KEY ("catalogo_id") REFERENCES "catalogos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suscripciones" ADD CONSTRAINT "suscripciones_catalogo_id_fkey"
    FOREIGN KEY ("catalogo_id") REFERENCES "catalogos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Fuera las reglas.
DROP TABLE "reglas_comision";
DROP TYPE "AmbitoRegla";
