import type { ValidationStatus } from "@/lib/constants/validacao";

export type Montadora = {
  id: number;
  name: string;
  country: string | null;
  website: string | null;
  notes: string | null;
  logoUrl: string | null;
  isActive: boolean;
  validationStatus: ValidationStatus;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  modelsCount: number;
};
