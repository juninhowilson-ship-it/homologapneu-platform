-- AlterTable
ALTER TABLE "document_uploads"
  ADD COLUMN "mimeType" TEXT,
  ADD COLUMN "storagePath" TEXT,
  ALTER COLUMN "fileContent" DROP NOT NULL;
