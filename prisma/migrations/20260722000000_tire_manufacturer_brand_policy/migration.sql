-- TireManufacturer ganha slug/brandPolicy/researchStatus (marcas de pneu
-- = "brands" pedido pelo usuário; reaproveitando a entidade já existente
-- em vez de criar uma tabela "brands" nova/duplicada).
--
-- brandPolicy é TEXT livre (não enum Postgres) por decisão explícita: a
-- política de uma marca precisa poder mudar sem exigir uma migration —
-- os valores válidos são mantidos em lib/constants/brandPolicy.ts.

-- CreateEnum
CREATE TYPE "BrandResearchStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- AlterTable
ALTER TABLE "tire_manufacturers" ADD COLUMN     "brandPolicy" TEXT NOT NULL DEFAULT 'APPLICATION_ONLY',
ADD COLUMN     "researchStatus" "BrandResearchStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tire_manufacturers_slug_key" ON "tire_manufacturers"("slug");
