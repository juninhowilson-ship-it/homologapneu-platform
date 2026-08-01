-- AlterTable
ALTER TABLE "official_sources" ADD COLUMN     "healthScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "avgResponseTimeMs" INTEGER,
ADD COLUMN     "totalChecks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "activeChecks" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastStatusChangeAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "OfficialSourceEventType" AS ENUM ('DESCOBERTA', 'VALIDACAO', 'MUDANCA_STATUS', 'NOVOS_DOCUMENTOS', 'REDIRECIONAMENTO');

-- CreateTable
CREATE TABLE "official_source_events" (
    "id" SERIAL NOT NULL,
    "officialSourceId" INTEGER NOT NULL,
    "type" "OfficialSourceEventType" NOT NULL,
    "previousStatus" "OfficialSourceStatus",
    "newStatus" "OfficialSourceStatus",
    "documentsCount" INTEGER,
    "blockReason" TEXT,
    "redirectedToUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "official_source_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "official_source_events_officialSourceId_idx" ON "official_source_events"("officialSourceId");

-- CreateIndex
CREATE INDEX "official_source_events_type_idx" ON "official_source_events"("type");

-- AddForeignKey
ALTER TABLE "official_source_events" ADD CONSTRAINT "official_source_events_officialSourceId_fkey" FOREIGN KEY ("officialSourceId") REFERENCES "official_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
