-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('MANUFACTURER', 'VEHICLE', 'TIRE', 'WHEEL', 'DOCUMENT', 'LOGO', 'THUMBNAIL');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDENTE', 'PROCESSANDO', 'DISPONIVEL', 'DUPLICADO', 'ERRO');

-- CreateTable
CREATE TABLE "media" (
    "id" SERIAL NOT NULL,
    "type" "MediaType" NOT NULL,
    "manufacturerId" INTEGER,
    "vehicleId" INTEGER,
    "tireId" INTEGER,
    "wheelId" INTEGER,
    "homologationId" INTEGER,
    "title" TEXT,
    "description" TEXT,
    "source" TEXT,
    "originalUrl" TEXT,
    "storageUrl" TEXT,
    "thumbnailUrl" TEXT,
    "sha256" TEXT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "size" INTEGER,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "media_type_idx" ON "media"("type");

-- CreateIndex
CREATE INDEX "media_status_idx" ON "media"("status");

-- CreateIndex
CREATE INDEX "media_manufacturerId_idx" ON "media"("manufacturerId");

-- CreateIndex
CREATE INDEX "media_vehicleId_idx" ON "media"("vehicleId");

-- CreateIndex
CREATE INDEX "media_tireId_idx" ON "media"("tireId");

-- CreateIndex
CREATE INDEX "media_wheelId_idx" ON "media"("wheelId");

-- CreateIndex
CREATE INDEX "media_homologationId_idx" ON "media"("homologationId");

-- CreateIndex
CREATE INDEX "media_sha256_idx" ON "media"("sha256");

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicle_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "wheels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media" ADD CONSTRAINT "media_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
