export type Homologacao = {
  id: number;
  code: string;
  vehicleId: number;
  vehicleLabel: string;
  manufacturerName: string;
  tireId: number;
  tireLabel: string;
  tireManufacturerName: string;
  year: number;
  version: string;
  engine: string;
  originalSize: string;
  optionalSize: string | null;
  runFlat: boolean;
  xl: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type HomologacaoListResponse = {
  data: Homologacao[];
  total: number;
  page: number;
  pageSize: number;
};
