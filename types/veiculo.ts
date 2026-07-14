import type {
  FuelType,
  VehicleCategory,
  VehicleSegment,
  DrivetrainType,
  TransmissionType,
} from "@/lib/constants/veiculo";
import type { ValidationStatus } from "@/lib/constants/validacao";

export type Veiculo = {
  id: number;
  manufacturerId: number;
  manufacturerName: string;
  model: string;
  version: string;
  internalCode: string | null;
  yearStart: number;
  yearEnd: number;
  manufactureYearStart: number | null;
  manufactureYearEnd: number | null;
  engine: string;
  power: string | null;
  torque: string | null;
  fuel: FuelType;
  category: VehicleCategory;
  regulatoryCategory: string | null;
  segment: VehicleSegment | null;
  platformName: string | null;
  transmissionType: TransmissionType | null;
  transmissionGears: number | null;
  drivetrain: DrivetrainType | null;
  doors: number | null;
  wheelbase: number | null;
  weight: number | null;
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
