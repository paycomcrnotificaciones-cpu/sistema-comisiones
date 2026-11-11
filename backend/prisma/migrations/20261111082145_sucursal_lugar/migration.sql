-- El código interno pasa a ser un lugar de referencia (texto libre).
ALTER TABLE "sucursales" RENAME COLUMN "codigo" TO "lugar";

-- Varias sucursales pueden estar en el mismo lugar.
DROP INDEX IF EXISTS "sucursales_empresa_id_codigo_key";
