-- Adiciona ManufacturerApplication.vehicleModelId (FK opcional para
-- VehicleModel) — mesmo espírito de ManufacturerProduct.tireId: só
-- preenchida depois que marca+modelo do catálogo do fabricante forem
-- resolvidos/confirmados contra a Base Mestre real. Escrita manualmente
-- (não via `prisma migrate dev`, que detectou drift pré-existente não
-- relacionado — uma tabela `audit_logs_legacy` com 9094 linhas fora do
-- schema.prisma — e tentaria dropá-la junto) para aplicar só esta
-- alteração aditiva, sem tocar em mais nada.

ALTER TABLE "manufacturer_applications" ADD COLUMN "vehicleModelId" INTEGER;

CREATE INDEX "manufacturer_applications_vehicleModelId_idx" ON "manufacturer_applications"("vehicleModelId");

ALTER TABLE "manufacturer_applications"
  ADD CONSTRAINT "manufacturer_applications_vehicleModelId_fkey"
  FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
