-- CreateTable
CREATE TABLE "data_sources" (
    "id" SERIAL NOT NULL,
    "connectorId" TEXT NOT NULL,
    "mechanism" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "manufacturerName" TEXT,
    "type" TEXT NOT NULL,
    "baseUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "reliability" INTEGER NOT NULL DEFAULT 0,
    "lastSyncAt" TIMESTAMP(3),
    "updateFrequency" TEXT,
    "importedRecordsCount" INTEGER NOT NULL DEFAULT 0,
    "confirmedHomologationsCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_queue_items" (
    "id" SERIAL NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "result" TEXT,
    "error" TEXT,

    CONSTRAINT "import_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "data_sources_connectorId_key" ON "data_sources"("connectorId");

-- CreateIndex
CREATE INDEX "data_sources_status_idx" ON "data_sources"("status");

-- CreateIndex
CREATE INDEX "data_sources_category_idx" ON "data_sources"("category");

-- CreateIndex
CREATE INDEX "import_queue_items_sourceId_idx" ON "import_queue_items"("sourceId");

-- CreateIndex
CREATE INDEX "import_queue_items_status_idx" ON "import_queue_items"("status");

-- AddForeignKey
ALTER TABLE "import_queue_items" ADD CONSTRAINT "import_queue_items_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "data_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
