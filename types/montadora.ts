import type { ValidationStatus } from "@/lib/constants/validacao";

export type Montadora = {
  id: number;
  name: string;
  legalName: string | null;
  groupName: string | null;
  country: string | null;
  website: string | null;
  notes: string | null;
  logoUrl: string | null;
  isActive: boolean;
  marketStartDate: string | null;
  marketEndDate: string | null;
  validationStatus: ValidationStatus;
  source: string | null;
  confidence: number | null;
  createdAt: string;
  updatedAt: string;
  modelsCount: number;
};
