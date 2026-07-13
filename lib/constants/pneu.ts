export const TIRE_CATEGORIES = [
  "PASSEIO",
  "SUV",
  "CAMINHONETE",
  "ESPORTIVO",
  "INVERNO",
  "COMERCIAL",
] as const;

export type TireCategory = (typeof TIRE_CATEGORIES)[number];

export const TIRE_CATEGORY_LABELS: Record<TireCategory, string> = {
  PASSEIO: "Passeio",
  SUV: "SUV",
  CAMINHONETE: "Caminhonete",
  ESPORTIVO: "Esportivo",
  INVERNO: "Inverno",
  COMERCIAL: "Comercial",
};

export const TIRE_SEGMENTS = ["POPULAR", "MEDIO", "PREMIUM", "LUXO"] as const;

export type TireSegment = (typeof TIRE_SEGMENTS)[number];

export const TIRE_SEGMENT_LABELS: Record<TireSegment, string> = {
  POPULAR: "Popular",
  MEDIO: "Médio",
  PREMIUM: "Premium",
  LUXO: "Luxo",
};

export const TIRE_TYPES = ["RADIAL", "DIAGONAL"] as const;

export type TireType = (typeof TIRE_TYPES)[number];

export const TIRE_TYPE_LABELS: Record<TireType, string> = {
  RADIAL: "Radial",
  DIAGONAL: "Diagonal",
};

export const PNEU_CSV_HEADERS = [
  "fabricante",
  "marca",
  "modelo",
  "largura",
  "perfil",
  "aro",
  "indiceCarga",
  "indiceVelocidade",
  "runFlat",
  "xl",
  "seal",
  "tubeless",
  "categoria",
  "segmento",
  "ean",
  "descricao",
  "status",
] as const;
