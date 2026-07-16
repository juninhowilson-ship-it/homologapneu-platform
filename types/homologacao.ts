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
  /// true quando role === "ORIGINAL" — é a "homologação OE" do pneu.
  isOE: boolean;
};

export type HomologacaoWheelItem = {
  id: number;
  wheelId: number;
  role: HomologacaoTireRole;
  width: number;
  diameter: number;
  offset: number | null;
  boltPattern: string;
  hubBore: number | null;
  isOE: boolean;
};

export type HomologacaoPressureSpec = {
  id: number;
  emptyFront: string | null;
  emptyRear: string | null;
  partialLoadFront: string | null;
  partialLoadRear: string | null;
  fullLoadFront: string | null;
  fullLoadRear: string | null;
  source: string | null;
  sourceUrl: string | null;
  createdAt: string;
};

export type HomologacaoDocumentItem = {
  id: number;
  name: string;
  url: string;
  type: string | null;
  page: number | null;
  sha256: string | null;
  manufacturerName: string | null;
  publishedAt: string | null;
  createdAt: string;
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
  generation: string | null;
  transmission: string | null;
  drivetrain: string | null;
  tires: HomologacaoTireItem[];
  originalTire: HomologacaoTireItem | null;
  optionalTires: HomologacaoTireItem[];
  wheels: HomologacaoWheelItem[];
  originalWheel: HomologacaoWheelItem | null;
  optionalWheels: HomologacaoWheelItem[];
  pressureSpecs: HomologacaoPressureSpec[];
  documents: HomologacaoDocumentItem[];
  createdAt: string;
  updatedAt: string;
};

export type HomologacaoListResponse = {
  data: Homologacao[];
  total: number;
  page: number;
  pageSize: number;
};
