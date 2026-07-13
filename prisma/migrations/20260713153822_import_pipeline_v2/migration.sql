-- AlterEnum
ALTER TYPE "ImportEntity" ADD VALUE 'FABRICANTES_PNEUS';

-- AlterEnum
ALTER TYPE "ImportFileType" ADD VALUE 'API';

-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "updatedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "tire_images" (
    "id" SERIAL NOT NULL,
    "tireId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT,
    "isCover" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tire_images_tireId_idx" ON "tire_images"("tireId");

-- AddForeignKey
ALTER TABLE "tire_images" ADD CONSTRAINT "tire_images_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE CASCADE ON UPDATE CASCADE;
