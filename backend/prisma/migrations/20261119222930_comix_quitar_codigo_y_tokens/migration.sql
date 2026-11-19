/*
  Warnings:

  - You are about to drop the column `codigo` on the `comisionistas` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TipoToken" AS ENUM ('INVITACION', 'RESETEO');

-- DropIndex
DROP INDEX "comisionistas_empresa_id_codigo_key";

-- AlterTable
ALTER TABLE "comisionistas" DROP COLUMN "codigo";

-- CreateTable
CREATE TABLE "tokens_acceso" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "tipo" "TipoToken" NOT NULL DEFAULT 'INVITACION',
    "expira_en" TIMESTAMP(3) NOT NULL,
    "usado_en" TIMESTAMP(3),
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_acceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tokens_acceso_token_hash_key" ON "tokens_acceso"("token_hash");

-- CreateIndex
CREATE INDEX "tokens_acceso_usuario_id_idx" ON "tokens_acceso"("usuario_id");

-- AddForeignKey
ALTER TABLE "tokens_acceso" ADD CONSTRAINT "tokens_acceso_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
