-- TireManufacturer.country vira opcional: a lista de marcas para
-- importação (política de pesquisa) não necessariamente informa país por
-- marca, e nunca preenchemos com um valor inventado quando ausente.

-- AlterTable
ALTER TABLE "tire_manufacturers" ALTER COLUMN "country" DROP NOT NULL;
