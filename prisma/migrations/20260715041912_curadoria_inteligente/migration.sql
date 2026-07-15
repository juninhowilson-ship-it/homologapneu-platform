-- CreateEnum
CREATE TYPE "DocumentFileType" AS ENUM ('PDF', 'XLSX', 'CSV');

-- CreateEnum
CREATE TYPE "DocumentUploadStatus" AS ENUM ('PENDENTE', 'PROCESSADO', 'ERRO');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('PENDENTE_REVISAO', 'APROVADA', 'REJEITADA', 'SOLICITAR_REVISAO');

-- CreateTable
CREATE TABLE "document_uploads" (
    "id" SERIAL NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" "DocumentFileType" NOT NULL,
    "fileHash" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileContent" BYTEA NOT NULL,
    "extractedText" TEXT,
    "declaredSourceType" "EvidenceSourceType" NOT NULL,
    "declaredSourceName" TEXT NOT NULL,
    "status" "DocumentUploadStatus" NOT NULL DEFAULT 'PENDENTE',
    "errorMessage" TEXT,
    "uploadedById" INTEGER,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homologation_candidates" (
    "id" SERIAL NOT NULL,
    "documentUploadId" INTEGER NOT NULL,
    "tireManufacturerName" TEXT,
    "tireModel" TEXT,
    "tireSize" TEXT,
    "loadIndex" TEXT,
    "speedIndex" TEXT,
    "runFlat" BOOLEAN,
    "xl" BOOLEAN,
    "vehicleManufacturerName" TEXT,
    "vehicleModel" TEXT,
    "vehicleVersion" TEXT,
    "yearStart" INTEGER,
    "yearEnd" INTEGER,
    "extractionConfidence" INTEGER NOT NULL DEFAULT 0,
    "rawSnippet" TEXT,
    "status" "CandidateStatus" NOT NULL DEFAULT 'PENDENTE_REVISAO',
    "reviewedById" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "evidenceId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homologation_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_uploads_status_idx" ON "document_uploads"("status");

-- CreateIndex
CREATE INDEX "document_uploads_fileHash_idx" ON "document_uploads"("fileHash");

-- CreateIndex
CREATE INDEX "homologation_candidates_status_idx" ON "homologation_candidates"("status");

-- CreateIndex
CREATE INDEX "homologation_candidates_documentUploadId_idx" ON "homologation_candidates"("documentUploadId");

-- AddForeignKey
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_candidates" ADD CONSTRAINT "homologation_candidates_documentUploadId_fkey" FOREIGN KEY ("documentUploadId") REFERENCES "document_uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homologation_candidates" ADD CONSTRAINT "homologation_candidates_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
