export const FUEL_TYPES = [
  "FLEX",
  "GASOLINA",
  "DIESEL",
  "ELETRICO",
  "HIBRIDO",
] as const;

export type FuelType = (typeof FUEL_TYPES)[number];

export const FUEL_LABELS: Record<FuelType, string> = {
  FLEX: "Flex",
  GASOLINA: "Gasolina",
  DIESEL: "Diesel",
  ELETRICO: "Elétrico",
  HIBRIDO: "Híbrido",
};

export const VEHICLE_CATEGORIES = [
  "HATCH",
  "SEDAN",
  "SUV",
  "PICAPE",
  "PERUA",
  "MINIVAN",
  "COUPE",
] as const;

export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  HATCH: "Hatch",
  SEDAN: "Sedã",
  SUV: "SUV",
  PICAPE: "Picape",
  PERUA: "Perua",
  MINIVAN: "Minivan",
  COUPE: "Coupé",
};

export const VEHICLE_SEGMENTS = [
  "POPULAR",
  "MEDIO",
  "PREMIUM",
  "LUXO",
] as const;

export type VehicleSegment = (typeof VEHICLE_SEGMENTS)[number];

export const SEGMENT_LABELS: Record<VehicleSegment, string> = {
  POPULAR: "Popular",
  MEDIO: "Médio",
  PREMIUM: "Premium",
  LUXO: "Luxo",
};

export const TRANSMISSION_TYPES = [
  "MANUAL",
  "AUTOMATICA",
  "CVT",
  "AUTOMATIZADA",
  "DUPLA_EMBREAGEM",
] as const;

export type TransmissionType = (typeof TRANSMISSION_TYPES)[number];

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  MANUAL: "Manual",
  AUTOMATICA: "Automática",
  CVT: "CVT",
  AUTOMATIZADA: "Automatizada",
  DUPLA_EMBREAGEM: "Dupla Embreagem",
};

export const DRIVETRAIN_TYPES = ["DIANTEIRA", "TRASEIRA", "INTEGRAL"] as const;

export type DrivetrainType = (typeof DRIVETRAIN_TYPES)[number];

export const DRIVETRAIN_LABELS: Record<DrivetrainType, string> = {
  DIANTEIRA: "Dianteira",
  TRASEIRA: "Traseira",
  INTEGRAL: "Integral",
};

export const VEICULO_CSV_HEADERS = [
  "marca",
  "modelo",
  "versao",
  "anoInicial",
  "anoFinal",
  "motorizacao",
  "potencia",
  "combustivel",
  "categoria",
  "segmento",
  "pais",
  "observacoes",
  "status",
] as const;

export const VEICULO_CSV_EXAMPLE_ROW = [
  "Toyota",
  "Corolla",
  "XEi",
  "2024",
  "2025",
  "Hybrid",
  "122cv",
  "Híbrido",
  "Sedã",
  "Médio",
  "Brasil",
  "Exemplo de observação",
  "ativo",
];
