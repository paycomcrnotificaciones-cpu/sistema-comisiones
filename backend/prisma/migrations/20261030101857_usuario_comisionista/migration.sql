-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN "comisionista_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_comisionista_id_key" ON "usuarios"("comisionista_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_comisionista_id_fkey" FOREIGN KEY ("comisionista_id") REFERENCES "comisionistas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
