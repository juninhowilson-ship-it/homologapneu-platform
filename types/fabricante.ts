import type { ValidationStatus } from "@/lib/constants/validacao";

export type Fabricante = {
  id: number;
  name: string;
  country: string;
  website: string | null;
  notes: string | null;
  logoUrl: string | null;
  isActive: boolean;
  validationStatus: ValidationStatus;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  tiresCount: number;
};

export type FabricanteListResponse = {
  data: Fabricante[];
  total: number;
  page: number;
  pageSize: number;
};
