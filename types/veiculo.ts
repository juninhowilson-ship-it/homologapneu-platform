import type {
  FuelType,
  VehicleCategory,
  VehicleSegment,
} from "@/lib/constants/veiculo";
import type { ValidationStatus } from "@/lib/constants/validacao";

export type Veiculo = {
  id: number;
  manufacturerId: number;
  manufacturerName: string;
  model: string;
  version: string;
  yearStart: number;
  yearEnd: number;
  engine: string;
  power: string | null;
  fuel: FuelType;
  category: VehicleCategory;
  segment: VehicleSegment | null;
  country: string | null;
  imageUrl: string | null;
  notes: string | null;
  isActive: boolean;
  validationStatus: ValidationStatus;
  source: string | null;
  validatedBy: string | null;
  validatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  homologationsCount: number;
};

export type VeiculoListResponse = {
  data: Veiculo[];
  total: number;
  page: number;
  pageSize: number;
};
