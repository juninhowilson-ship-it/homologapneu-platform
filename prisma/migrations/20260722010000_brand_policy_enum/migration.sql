-- TireManufacturer.brandPolicy: TEXT livre -> enum Prisma BrandPolicy
-- (decisão revisada pelo usuário em 2026-07-22). Migration escrita à mão
-- em vez de usar o diff bruto do Prisma: o diff automático propõe
-- DROP COLUMN + ADD COLUMN, o que reseta toda linha existente para o
-- default — destruindo as políticas OEM_AND_APPLICATION já gravadas
-- (Linglong/Toyo/Maxxis). Em vez disso, converte o tipo da coluna via
-- USING cast, preservando o valor de cada linha.

-- CreateEnum
CREATE TYPE "BrandPolicy" AS ENUM ('OEM_ONLY', 'OEM_AND_APPLICATION', 'APPLICATION_ONLY', 'HISTORICAL_ONLY');

-- AlterTable (cast seguro — preserva o valor atual de cada linha)
ALTER TABLE "tire_manufacturers"
  ALTER COLUMN "brandPolicy" DROP DEFAULT,
  ALTER COLUMN "brandPolicy" TYPE "BrandPolicy" USING "brandPolicy"::"BrandPolicy",
  ALTER COLUMN "brandPolicy" SET DEFAULT 'APPLICATION_ONLY'::"BrandPolicy";
