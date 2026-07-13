-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN     "collectedAt" TIMESTAMP(3),
ADD COLUMN     "sourceVersion" TEXT;

-- AlterTable
ALTER TABLE "tires" ADD COLUMN     "loadIndexId" INTEGER,
ADD COLUMN     "speedIndexId" INTEGER;

-- CreateTable
CREATE TABLE "load_indexes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "maxLoadKg" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "load_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "speed_indexes" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "maxSpeedKmh" INTEGER,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "speed_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "load_indexes_code_key" ON "load_indexes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "speed_indexes_code_key" ON "speed_indexes"("code");

-- CreateIndex
CREATE INDEX "tires_loadIndexId_idx" ON "tires"("loadIndexId");

-- CreateIndex
CREATE INDEX "tires_speedIndexId_idx" ON "tires"("speedIndexId");

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_loadIndexId_fkey" FOREIGN KEY ("loadIndexId") REFERENCES "load_indexes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tires" ADD CONSTRAINT "tires_speedIndexId_fkey" FOREIGN KEY ("speedIndexId") REFERENCES "speed_indexes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
