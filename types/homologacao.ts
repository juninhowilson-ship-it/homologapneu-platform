import type { ValidationStatus } from "@/lib/constants/validacao";

export type HomologacaoTireRole = "ORIGINAL" | "OPCIONAL";

export type HomologacaoTireItem = {
  id: number;
  tireId: number;
  role: HomologacaoTireRole;
  tireLabel: string;
  tireManufacturerName: string;
  size: string;
  runFlat: boolean;
  xl: boolean;
};

export type Homologacao = {
  id: number;
  code: string;
  vehicleId: number;
  vehicleLabel: string;
  manufacturerName: string;
  year: number;
  manufactureYear: number | null;
  version: string;
  engine: string;
  notes: string | null;
  validationStatus: ValidationStatus;
  source: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  tires: HomologacaoTireItem[];
  originalTire: HomologacaoTireItem | null;
  optionalTires: HomologacaoTireItem[];
  createdAt: string;
  updatedAt: string;
};

export type HomologacaoListResponse = {
  data: Homologacao[];
  total: number;
  page: number;
  pageSize: number;
};
