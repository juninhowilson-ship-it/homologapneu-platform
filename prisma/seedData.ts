export const MANUFACTURERS = [
  "Toyota",
  "Volkswagen",
  "Honda",
  "BYD",
  "BMW",
  "Mercedes-Benz",
  "Hyundai",
  "Chevrolet",
  "Fiat",
  "Jeep",
] as const;

export const TIRE_MANUFACTURERS = [
  {
    name: "Michelin",
    country: "França",
    website: "https://www.michelin.com.br",
    notes: "Fabricante premium, forte presença em pneus de alta performance.",
    isActive: true,
  },
  {
    name: "Pirelli",
    country: "Itália",
    website: "https://www.pirelli.com.br",
    notes: "Parceiro de homologação de diversas montadoras esportivas.",
    isActive: true,
  },
  {
    name: "Goodyear",
    country: "Estados Unidos",
    website: "https://www.goodyear.com.br",
    notes: null,
    isActive: true,
  },
  {
    name: "Continental",
    country: "Alemanha",
    website: "https://www.continental.com.br",
    notes: null,
    isActive: true,
  },
  {
    name: "Bridgestone",
    country: "Japão",
    website: "https://www.bridgestone.com.br",
    notes: null,
    isActive: true,
  },
  {
    name: "Dunlop",
    country: "Reino Unido",
    website: "https://www.dunlop.com.br",
    notes: null,
    isActive: true,
  },
  {
    name: "Firestone",
    country: "Estados Unidos",
    website: "https://www.firestone.com.br",
    notes: "Cadastro em revisão comercial.",
    isActive: false,
  },
  {
    name: "Yokohama",
    country: "Japão",
    website: "https://www.yokohama.com.br",
    notes: null,
    isActive: true,
  },
] as const;

type VehicleSeed = {
  manufacturer: (typeof MANUFACTURERS)[number];
  model: string;
  year: number;
  engine: string;
};

export const VEHICLES: VehicleSeed[] = [
  { manufacturer: "Toyota", model: "Corolla", year: 2025, engine: "Hybrid" },
  { manufacturer: "Toyota", model: "Corolla", year: 2024, engine: "2.0" },
  { manufacturer: "Toyota", model: "Hilux", year: 2025, engine: "2.8 Diesel" },
  { manufacturer: "Volkswagen", model: "Golf", year: 2023, engine: "1.4 TSI" },
  { manufacturer: "Volkswagen", model: "T-Cross", year: 2025, engine: "1.0 TSI" },
  { manufacturer: "Honda", model: "Civic", year: 2024, engine: "2.0" },
  { manufacturer: "Honda", model: "HR-V", year: 2025, engine: "1.5 Turbo" },
  { manufacturer: "BYD", model: "Dolphin", year: 2025, engine: "Elétrico" },
  { manufacturer: "BYD", model: "Song Plus", year: 2025, engine: "Híbrido" },
  { manufacturer: "BMW", model: "320i", year: 2024, engine: "2.0 Turbo" },
  { manufacturer: "BMW", model: "X1", year: 2025, engine: "2.0 Turbo" },
  { manufacturer: "Mercedes-Benz", model: "C180", year: 2024, engine: "1.5 Turbo" },
  { manufacturer: "Hyundai", model: "Creta", year: 2025, engine: "1.0 Turbo" },
  { manufacturer: "Chevrolet", model: "Onix", year: 2024, engine: "1.0 Turbo" },
  { manufacturer: "Fiat", model: "Pulse", year: 2025, engine: "1.3 Turbo" },
  { manufacturer: "Jeep", model: "Compass", year: 2024, engine: "1.3 Turbo" },
];

type TireSeed = {
  manufacturer: (typeof TIRE_MANUFACTURERS)[number]["name"];
  model: string;
  size: string;
  loadIndex: string;
  speedIndex: string;
  runFlat: boolean;
  xl: boolean;
};

export const TIRES: TireSeed[] = [
  { manufacturer: "Michelin", model: "Primacy 4", size: "205/55R16", loadIndex: "91", speedIndex: "V", runFlat: false, xl: false },
  { manufacturer: "Michelin", model: "Pilot Sport 4", size: "225/45R18", loadIndex: "95", speedIndex: "Y", runFlat: false, xl: true },
  { manufacturer: "Michelin", model: "Latitude Sport 3", size: "235/55R19", loadIndex: "105", speedIndex: "V", runFlat: false, xl: true },
  { manufacturer: "Pirelli", model: "Cinturato P7", size: "205/55R16", loadIndex: "91", speedIndex: "V", runFlat: false, xl: false },
  { manufacturer: "Pirelli", model: "P Zero", size: "245/40R19", loadIndex: "98", speedIndex: "Y", runFlat: true, xl: true },
  { manufacturer: "Pirelli", model: "Scorpion", size: "255/45R20", loadIndex: "105", speedIndex: "W", runFlat: true, xl: true },
  { manufacturer: "Goodyear", model: "EfficientGrip Performance", size: "195/60R16", loadIndex: "89", speedIndex: "H", runFlat: false, xl: false },
  { manufacturer: "Goodyear", model: "Eagle F1", size: "225/40R18", loadIndex: "92", speedIndex: "W", runFlat: false, xl: true },
  { manufacturer: "Continental", model: "PremiumContact 6", size: "205/55R16", loadIndex: "91", speedIndex: "V", runFlat: false, xl: false },
  { manufacturer: "Continental", model: "SportContact 6", size: "245/35R20", loadIndex: "95", speedIndex: "Y", runFlat: true, xl: true },
  { manufacturer: "Bridgestone", model: "Turanza", size: "195/65R15", loadIndex: "91", speedIndex: "H", runFlat: false, xl: false },
  { manufacturer: "Bridgestone", model: "Potenza", size: "225/45R17", loadIndex: "94", speedIndex: "W", runFlat: false, xl: true },
  { manufacturer: "Dunlop", model: "SP Sport", size: "205/50R17", loadIndex: "93", speedIndex: "V", runFlat: false, xl: false },
  { manufacturer: "Dunlop", model: "Grandtrek", size: "265/60R18", loadIndex: "110", speedIndex: "H", runFlat: false, xl: false },
  { manufacturer: "Firestone", model: "Destination", size: "235/60R18", loadIndex: "107", speedIndex: "H", runFlat: false, xl: false },
  { manufacturer: "Yokohama", model: "BluEarth", size: "195/55R16", loadIndex: "87", speedIndex: "V", runFlat: false, xl: false },
];

type HomologationSeed = {
  code: string;
  vehicle: { manufacturer: (typeof MANUFACTURERS)[number]; model: string; year: number };
  tire: { manufacturer: (typeof TIRE_MANUFACTURERS)[number]["name"]; model: string; size: string };
};

export const HOMOLOGATIONS: HomologationSeed[] = [
  { code: "T0", vehicle: { manufacturer: "Toyota", model: "Corolla", year: 2025 }, tire: { manufacturer: "Michelin", model: "Primacy 4", size: "205/55R16" } },
  { code: "T0", vehicle: { manufacturer: "Toyota", model: "Corolla", year: 2024 }, tire: { manufacturer: "Pirelli", model: "Cinturato P7", size: "205/55R16" } },
  { code: "T1", vehicle: { manufacturer: "Toyota", model: "Hilux", year: 2025 }, tire: { manufacturer: "Dunlop", model: "Grandtrek", size: "265/60R18" } },
  { code: "VO", vehicle: { manufacturer: "Volkswagen", model: "Golf", year: 2023 }, tire: { manufacturer: "Continental", model: "PremiumContact 6", size: "205/55R16" } },
  { code: "VO", vehicle: { manufacturer: "Volkswagen", model: "T-Cross", year: 2025 }, tire: { manufacturer: "Goodyear", model: "EfficientGrip Performance", size: "195/60R16" } },
  { code: "H0", vehicle: { manufacturer: "Honda", model: "Civic", year: 2024 }, tire: { manufacturer: "Bridgestone", model: "Turanza", size: "195/65R15" } },
  { code: "H1", vehicle: { manufacturer: "Honda", model: "HR-V", year: 2025 }, tire: { manufacturer: "Bridgestone", model: "Potenza", size: "225/45R17" } },
  { code: "BY", vehicle: { manufacturer: "BYD", model: "Dolphin", year: 2025 }, tire: { manufacturer: "Yokohama", model: "BluEarth", size: "195/55R16" } },
  { code: "BY", vehicle: { manufacturer: "BYD", model: "Song Plus", year: 2025 }, tire: { manufacturer: "Michelin", model: "Latitude Sport 3", size: "235/55R19" } },
  { code: "*", vehicle: { manufacturer: "BMW", model: "320i", year: 2024 }, tire: { manufacturer: "Goodyear", model: "Eagle F1", size: "225/40R18" } },
  { code: "*", vehicle: { manufacturer: "BMW", model: "X1", year: 2025 }, tire: { manufacturer: "Continental", model: "SportContact 6", size: "245/35R20" } },
  { code: "*", vehicle: { manufacturer: "BMW", model: "X1", year: 2025 }, tire: { manufacturer: "Pirelli", model: "P Zero", size: "245/40R19" } },
  { code: "MO", vehicle: { manufacturer: "Mercedes-Benz", model: "C180", year: 2024 }, tire: { manufacturer: "Michelin", model: "Pilot Sport 4", size: "225/45R18" } },
  { code: "HY", vehicle: { manufacturer: "Hyundai", model: "Creta", year: 2025 }, tire: { manufacturer: "Dunlop", model: "SP Sport", size: "205/50R17" } },
  { code: "CH", vehicle: { manufacturer: "Chevrolet", model: "Onix", year: 2024 }, tire: { manufacturer: "Goodyear", model: "EfficientGrip Performance", size: "195/60R16" } },
  { code: "FI", vehicle: { manufacturer: "Fiat", model: "Pulse", year: 2025 }, tire: { manufacturer: "Pirelli", model: "Cinturato P7", size: "205/55R16" } },
  { code: "JP", vehicle: { manufacturer: "Jeep", model: "Compass", year: 2024 }, tire: { manufacturer: "Firestone", model: "Destination", size: "235/60R18" } },
  { code: "JP", vehicle: { manufacturer: "Jeep", model: "Compass", year: 2024 }, tire: { manufacturer: "Pirelli", model: "Scorpion", size: "255/45R20" } },
];
