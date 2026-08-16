-- Catálogo comercial de referência, sincronizado do Intelli Tire (ERP de
-- pneus, projeto irmão). Responde "este pneu existe e ainda gira?", que é
-- pergunta distinta de "é homologado". Tabela própria de propósito: um SKU
-- de varejo não é fonte oficial de montadora e nunca vira homologação.

CREATE TABLE "commercial_tire_offers" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "loadIndex" TEXT,
    "speedIndex" TEXT,
    "oeMarking" TEXT,
    "runFlat" BOOLEAN NOT NULL DEFAULT false,
    "rawDescription" TEXT NOT NULL,
    "soldUnits" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commercial_tire_offers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "commercial_tire_offers_size_idx" ON "commercial_tire_offers"("size");
CREATE UNIQUE INDEX "commercial_tire_offers_brand_model_size_oeMarking_key" ON "commercial_tire_offers"("brand", "model", "size", "oeMarking");

ALTER TABLE "commercial_tire_offers" ENABLE ROW LEVEL SECURITY;
