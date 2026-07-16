-- AlterEnum
ALTER TYPE "ImportEntity" ADD VALUE 'RODAS';

-- AlterTable
ALTER TABLE "homologation_documents" ADD COLUMN     "manufacturerName" TEXT,
ADD COLUMN     "page" INTEGER,
ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "sha256" TEXT;

-- CreateTable
CREATE TABLE "wheels" (
    "id" SERIAL NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "diameter" INTEGER NOT NULL,
    "offset" INTEGER,
    "boltPattern" TEXT NOT NULL,
    "hubBore" DOUBLE PRECISION,
    "source" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wheels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_wheels" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "wheelId" INTEGER NOT NULL,
    "role" "HomologationTireRole" NOT NULL DEFAULT 'ORIGINAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homologation_wheels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_pressure_specs" (
    "id" SERIAL NOT NULL,
    "homologationId" INTEGER NOT NULL,
    "emptyFront" TEXT,
    "emptyRear" TEXT,
    "partialLoadFront" TEXT,
    "partialLoadRear" TEXT,
    "fullLoadFront" TEXT,
    "fullLoadRear" TEXT,
    "source" TEXT,
    "sourceUrl" TEXT,
    "validationStatus" "ValidationStatus" NOT NULL DEFAULT 'NECESSITA_VALIDACAO',
    "confidence" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_pressure_specs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "wheels_diameter_idx" ON "wheels"("diameter");

-- CreateIndex
CREATE INDEX "wheels_boltPattern_idx" ON "wheels"("boltPattern");

-- CreateIndex
CREATE INDEX "wheels_validationStatus_idx" ON "wheels"("validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "wheels_width_diameter_offset_boltPattern_key" ON "wheels"("width", "diameter", "offset", "boltPattern");

-- CreateIndex
CREATE INDEX "homologation_wheels_wheelId_idx" ON "homologation_wheels"("wheelId");

-- CreateIndex
CREATE UNIQUE INDEX "homologation_wheels_homologationId_wheelId_key" ON "homologation_wheels"("homologationId", "wheelId");

-- CreateIndex
CREATE INDEX "vehicle_pressure_specs_homologationId_idx" ON "vehicle_pressure_specs"("homologationId");

-- CreateIndex
CREATE INDEX "homologation_documents_sha256_idx" ON "homologation_documents"("sha256");

-- AddForeignKey
ALTER TABLE "homologation_wheels" ADD CONSTRAINT "homologation_wheels_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_wheels" ADD CONSTRAINT "homologation_wheels_wheelId_fkey" FOREIGN KEY ("wheelId") REFERENCES "wheels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_pressure_specs" ADD CONSTRAINT "vehicle_pressure_specs_homologationId_fkey" FOREIGN KEY ("homologationId") REFERENCES "homologations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
