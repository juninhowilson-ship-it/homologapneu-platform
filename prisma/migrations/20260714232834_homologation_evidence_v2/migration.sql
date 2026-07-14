/*
  Warnings:

  - Made the column `vehicleVersion` on table `homologation_evidences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `yearStart` on table `homologation_evidences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `yearEnd` on table `homologation_evidences` required. This step will fail if there are existing NULL values in that column.
  - Made the column `vehicleVersion` on table `tire_vehicle_applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `yearStart` on table `tire_vehicle_applications` required. This step will fail if there are existing NULL values in that column.
  - Made the column `yearEnd` on table `tire_vehicle_applications` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "homologation_evidences" ALTER COLUMN "vehicleVersion" SET NOT NULL,
ALTER COLUMN "vehicleVersion" SET DEFAULT '',
ALTER COLUMN "yearStart" SET NOT NULL,
ALTER COLUMN "yearStart" SET DEFAULT 0,
ALTER COLUMN "yearEnd" SET NOT NULL,
ALTER COLUMN "yearEnd" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "tire_vehicle_applications" ALTER COLUMN "vehicleVersion" SET NOT NULL,
ALTER COLUMN "vehicleVersion" SET DEFAULT '',
ALTER COLUMN "yearStart" SET NOT NULL,
ALTER COLUMN "yearStart" SET DEFAULT 0,
ALTER COLUMN "yearEnd" SET NOT NULL,
ALTER COLUMN "yearEnd" SET DEFAULT 0;
