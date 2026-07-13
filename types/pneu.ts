import type { TireCategory, TireSegment, TireType } from "@/lib/constants/pneu";
import type { ValidationStatus } from "@/lib/constants/validacao";

export type Pneu = {
  id: number;
  tireManufacturerId: number;
  tireManufacturerName: string;
  brand: string;
  model: string;
  family: string | null;
  size: string;
  width: number;
  profile: number;
  rim: number;
  loadIndex: string;
  speedIndex: string;
  runFlat: boolean;
  xl: boolean;
  seal: boolean;
  tubeless: boolean;
  type: TireType;
  category: TireCategory;
  segment: TireSegment | null;
  ean: string | null;
  description: string | null;
  imageUrl: string | null;
  isActive: boolean;
  validationStatus: ValidationStatus;
  source: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  homologationsCount: number;
};

export type PneuListResponse = {
  data: Pneu[];
  total: number;
  page: number;
  pageSize: number;
};
