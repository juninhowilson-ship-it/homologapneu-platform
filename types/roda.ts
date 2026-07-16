import type { ValidationStatus } from "@/lib/constants/validacao";

export type Roda = {
  id: number;
  width: number;
  diameter: number;
  offset: number | null;
  boltPattern: string;
  hubBore: number | null;
  validationStatus: ValidationStatus;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  homologationsCount: number;
};

export type RodaListResponse = {
  data: Roda[];
  total: number;
  page: number;
  pageSize: number;
};
