-- AlterTable
ALTER TABLE "homologations" ADD COLUMN     "manufactureYear" INTEGER;

-- AlterTable
ALTER TABLE "tires" ADD COLUMN     "pncs" TEXT;

-- CreateTable
CREATE TABLE "technologies" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "technologies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tire_technologies" (
    "tireId" INTEGER NOT NULL,
    "technologyId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tire_technologies_pkey" PRIMARY KEY ("tireId","technologyId")
);

-- CreateIndex
CREATE UNIQUE INDEX "technologies_name_key" ON "technologies"("name");

-- CreateIndex
CREATE INDEX "tire_technologies_technologyId_idx" ON "tire_technologies"("technologyId");

-- AddForeignKey
ALTER TABLE "tire_technologies" ADD CONSTRAINT "tire_technologies_tireId_fkey" FOREIGN KEY ("tireId") REFERENCES "tires"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tire_technologies" ADD CONSTRAINT "tire_technologies_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "technologies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
