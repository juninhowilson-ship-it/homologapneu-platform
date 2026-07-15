/*
  Warnings:

  - Substitui o enum ApplicationStatus: remove EVIDENCIA, adiciona
    ALTA_CONFIANCA e DIVERGENCIA, renomeia o antigo nivel padrao para
    EVIDENCIA_ISOLADA. Seguro porque tire_vehicle_applications esta vazia
    neste momento (0 linhas) — sem dados a converter.

*/
ALTER TYPE "ApplicationStatus" RENAME TO "ApplicationStatus_old";

CREATE TYPE "ApplicationStatus" AS ENUM ('EVIDENCIA_ISOLADA', 'APLICACAO_COMERCIAL', 'ALTA_CONFIANCA', 'HOMOLOGACAO_VALIDADA', 'DIVERGENCIA');

ALTER TABLE "tire_vehicle_applications" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "tire_vehicle_applications" ALTER COLUMN "status" TYPE "ApplicationStatus" USING ("status"::text::"ApplicationStatus");
ALTER TABLE "tire_vehicle_applications" ALTER COLUMN "status" SET DEFAULT 'EVIDENCIA_ISOLADA';

DROP TYPE "ApplicationStatus_old";
