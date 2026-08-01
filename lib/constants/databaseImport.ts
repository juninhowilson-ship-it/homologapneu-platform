/**
 * Chaves das pastas de database/import/ — sem `server-only` de propósito:
 * usado tanto pelo dispatcher (lib/importer/folderImport.ts) quanto pelo
 * componente cliente do botão "IMPORTAR DADOS".
 *
 * Nomes de pasta já existentes NUNCA são renomeados aqui (ex.: "vehicles"
 * continua "vehicles", não "vehicle_versions", mesmo a entidade sendo
 * VehicleVersion) — regra explícita: não alterar nomes de pastas sem
 * necessidade.
 */
export const FOLDER_KEYS = [
  "countries",
  "vehicle_manufacturers",
  "brands",
  "markets",
  "vehicle_models",
  "tire_models",
  "vehicles",
  "tire_sizes",
  "oe_codes",
  "technologies",
  "applications",
  "homologations",
  "sources",
  "documents",
] as const;

export type FolderKey = (typeof FOLDER_KEYS)[number];

export const FOLDER_LABELS: Record<FolderKey, string> = {
  countries: "Países",
  vehicle_manufacturers: "Montadoras",
  brands: "Marcas de pneu",
  markets: "Mercados",
  vehicle_models: "Modelos de veículo",
  tire_models: "Modelos de pneu",
  vehicles: "Veículos (versões)",
  tire_sizes: "Medidas (SKU completo)",
  oe_codes: "Códigos OE",
  technologies: "Tecnologias",
  applications: "Aplicações (pneu × veículo)",
  homologations: "Homologações",
  sources: "Fontes oficiais",
  documents: "Documentos",
};

/**
 * Pré-requisitos diretos de cada pasta — cada uma lista só o que ela
 * REALMENTE depende (não "tudo que vem antes numa lista", que quebra
 * assim que existe mais de uma trilha independente — ex.: brands/
 * tire_models/tire_sizes não têm nada a ver com vehicle_manufacturers/
 * vehicle_models/vehicles; as duas trilhas só convergem em applications).
 * lib/importer/folderImport.ts's assertPriorStepsConsistent() percorre
 * este mapa (não mais um array linear) para decidir o que bloqueia o quê.
 */
export const FOLDER_PREREQUISITES: Record<FolderKey, FolderKey[]> = {
  countries: [],
  vehicle_manufacturers: [],
  // countries -> brands não é uma FK real (TireManufacturer.country é
  // texto livre) — mantido mesmo assim porque foi uma ordem explícita e
  // deliberada do usuário (2026-07-22: "1. countries 2. brands..."), não
  // um efeito colateral do desenho antigo em array.
  brands: ["countries"],
  markets: [],
  vehicle_models: ["vehicle_manufacturers"],
  tire_models: ["brands"],
  vehicles: ["vehicle_models"],
  tire_sizes: ["tire_models"],
  oe_codes: ["vehicle_manufacturers"],
  technologies: [],
  applications: ["tire_sizes", "vehicles"],
  homologations: ["applications"],
  sources: [],
  documents: ["vehicles"],
};

export function isFolderKey(value: string): value is FolderKey {
  return (FOLDER_KEYS as readonly string[]).includes(value);
}
