-- CreateTable
CREATE TABLE "search_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "resumo" TEXT NOT NULL,
    "veiculoBusca" TEXT,
    "pneuBusca" TEXT,
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "search_logs_createdAt_idx" ON "search_logs"("createdAt");
