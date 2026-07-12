export const USERS = [
  {
    name: "Administrador",
    email: "admin@homologapneu.com.br",
    password: "Admin@123",
    role: "ADMIN" as const,
  },
  {
    name: "Usuário Padrão",
    email: "usuario@homologapneu.com.br",
    password: "Usuario@123",
    role: "USUARIO" as const,
  },
];

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
  {
    name: "Linglong",
    country: "China",
    website: "https://www.linglong.com.br",
    notes: "Fornecedor de equipamento original de montadoras chinesas (ex.: BYD).",
    isActive: true,
  },
] as const;

type VehicleSeed = {
  manufacturer: (typeof MANUFACTURERS)[number];
  model: string;
  version: string;
  yearStart: number;
  yearEnd: number;
  engine: string;
  power: string;
  fuel: "FLEX" | "GASOLINA" | "DIESEL" | "ELETRICO" | "HIBRIDO";
  category: "HATCH" | "SEDAN" | "SUV" | "PICAPE" | "PERUA" | "MINIVAN" | "COUPE";
  segment: "POPULAR" | "MEDIO" | "PREMIUM" | "LUXO";
  country: string;
  notes: string | null;
  isActive: boolean;
};

export const VEHICLES: VehicleSeed[] = [
  { manufacturer: "Toyota", model: "Corolla", version: "XEi", yearStart: 2024, yearEnd: 2025, engine: "Hybrid", power: "122cv", fuel: "HIBRIDO", category: "SEDAN", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Toyota", model: "Corolla", version: "GLi", yearStart: 2023, yearEnd: 2024, engine: "2.0", power: "177cv", fuel: "FLEX", category: "SEDAN", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Toyota", model: "Hilux", version: "SRX", yearStart: 2024, yearEnd: 2025, engine: "2.8 Diesel", power: "204cv", fuel: "DIESEL", category: "PICAPE", segment: "PREMIUM", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Volkswagen", model: "Golf", version: "GTI", yearStart: 2022, yearEnd: 2023, engine: "2.0 TSI", power: "230cv", fuel: "FLEX", category: "HATCH", segment: "PREMIUM", country: "Alemanha", notes: "Versão importada, produção encerrada no Brasil. Motor corrigido para 2.0 TSI/230cv conforme ficha técnica oficial (era 1.4 TSI/150cv).", isActive: true },
  { manufacturer: "Volkswagen", model: "T-Cross", version: "Highline", yearStart: 2024, yearEnd: 2025, engine: "1.0 TSI", power: "116cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Honda", model: "Civic", version: "Touring", yearStart: 2023, yearEnd: 2024, engine: "2.0", power: "155cv", fuel: "FLEX", category: "SEDAN", segment: "PREMIUM", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Honda", model: "HR-V", version: "EXL", yearStart: 2024, yearEnd: 2025, engine: "1.5 Turbo", power: "177cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "BYD", model: "Dolphin", version: "Plus", yearStart: 2024, yearEnd: 2025, engine: "Elétrico", power: "204cv", fuel: "ELETRICO", category: "HATCH", segment: "MEDIO", country: "China", notes: null, isActive: true },
  { manufacturer: "BYD", model: "Song Plus", version: "Premium", yearStart: 2024, yearEnd: 2025, engine: "Híbrido", power: "223cv", fuel: "HIBRIDO", category: "SUV", segment: "PREMIUM", country: "China", notes: null, isActive: true },
  { manufacturer: "BMW", model: "320i", version: "M Sport", yearStart: 2023, yearEnd: 2024, engine: "2.0 Turbo", power: "184cv", fuel: "GASOLINA", category: "SEDAN", segment: "LUXO", country: "Alemanha", notes: "Versão descontinuada após atualização da geração.", isActive: false },
  { manufacturer: "BMW", model: "X1", version: "sDrive20i", yearStart: 2024, yearEnd: 2025, engine: "2.0 Turbo", power: "170cv", fuel: "GASOLINA", category: "SUV", segment: "LUXO", country: "Alemanha", notes: null, isActive: true },
  { manufacturer: "Mercedes-Benz", model: "C180", version: "Avantgarde", yearStart: 2023, yearEnd: 2024, engine: "1.5 Turbo", power: "156cv", fuel: "GASOLINA", category: "SEDAN", segment: "LUXO", country: "Alemanha", notes: null, isActive: true },
  { manufacturer: "Hyundai", model: "Creta", version: "Ultimate", yearStart: 2024, yearEnd: 2025, engine: "2.0 Flex", power: "167cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: "Motor corrigido para 2.0 Flex/167cv conforme ficha técnica oficial (era 1.0 Turbo/120cv).", isActive: true },
  { manufacturer: "Chevrolet", model: "Onix", version: "Premier", yearStart: 2023, yearEnd: 2024, engine: "1.0 Turbo", power: "116cv", fuel: "FLEX", category: "HATCH", segment: "POPULAR", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Fiat", model: "Pulse", version: "Impetus", yearStart: 2024, yearEnd: 2025, engine: "1.3 Turbo", power: "185cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Jeep", model: "Compass", version: "Longitude", yearStart: 2023, yearEnd: 2024, engine: "1.3 Turbo", power: "185cv", fuel: "FLEX", category: "SUV", segment: "PREMIUM", country: "Brasil", notes: null, isActive: true },
];

export type TireCategoryValue =
  | "PASSEIO"
  | "SUV"
  | "CAMINHONETE"
  | "ESPORTIVO"
  | "INVERNO"
  | "COMERCIAL";
export type TireSegmentValue = "POPULAR" | "MEDIO" | "PREMIUM" | "LUXO";

type TireSeed = {
  manufacturer: (typeof TIRE_MANUFACTURERS)[number]["name"];
  brand: string;
  model: string;
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
  category: TireCategoryValue;
  segment: TireSegmentValue;
  ean: string;
  description: string;
  isActive: boolean;
};

type TireLineTemplate = {
  manufacturer: (typeof TIRE_MANUFACTURERS)[number]["name"];
  brand: string;
  model: string;
  category: TireCategoryValue;
  segment: TireSegmentValue;
  runFlat: boolean;
  xl: boolean;
  seal: boolean;
  tubeless: boolean;
};

const TIRE_LINES: TireLineTemplate[] = [
  { manufacturer: "Michelin", brand: "Michelin", model: "Primacy 4", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Michelin", brand: "Michelin", model: "Pilot Sport 4", category: "ESPORTIVO", segment: "PREMIUM", runFlat: false, xl: true, seal: false, tubeless: true },
  { manufacturer: "Michelin", brand: "Michelin", model: "Latitude Sport 3", category: "SUV", segment: "PREMIUM", runFlat: false, xl: true, seal: false, tubeless: true },
  { manufacturer: "Michelin", brand: "Michelin", model: "CrossClimate 2", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "Cinturato P7", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "P Zero", category: "ESPORTIVO", segment: "LUXO", runFlat: true, xl: true, seal: false, tubeless: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "Scorpion", category: "SUV", segment: "PREMIUM", runFlat: true, xl: true, seal: false, tubeless: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "Scorpion Winter", category: "INVERNO", segment: "PREMIUM", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Goodyear", brand: "Goodyear", model: "EfficientGrip Performance", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Goodyear", brand: "Goodyear", model: "Eagle F1", category: "ESPORTIVO", segment: "PREMIUM", runFlat: false, xl: true, seal: false, tubeless: true },
  { manufacturer: "Goodyear", brand: "Dunlop", model: "SP Sport", category: "ESPORTIVO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Continental", brand: "Continental", model: "PremiumContact 6", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Continental", brand: "Continental", model: "SportContact 6", category: "ESPORTIVO", segment: "LUXO", runFlat: true, xl: true, seal: false, tubeless: true },
  { manufacturer: "Continental", brand: "General Tire", model: "Grabber", category: "SUV", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Continental", brand: "Continental", model: "ContiSeal Eco", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: true, tubeless: true },
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "Turanza", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "Potenza", category: "ESPORTIVO", segment: "PREMIUM", runFlat: false, xl: true, seal: false, tubeless: true },
  { manufacturer: "Bridgestone", brand: "Firestone", model: "Destination", category: "CAMINHONETE", segment: "POPULAR", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "Blizzak", category: "INVERNO", segment: "PREMIUM", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Dunlop", brand: "Dunlop", model: "SP Sport Maxx", category: "ESPORTIVO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Dunlop", brand: "Dunlop", model: "Grandtrek", category: "SUV", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Dunlop", brand: "Dunlop", model: "Econodrive", category: "COMERCIAL", segment: "POPULAR", runFlat: false, xl: false, seal: false, tubeless: false },
  { manufacturer: "Firestone", brand: "Firestone", model: "Destination LE3", category: "SUV", segment: "POPULAR", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Firestone", brand: "Firestone", model: "F-600", category: "PASSEIO", segment: "POPULAR", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Firestone", brand: "Firestone", model: "Transforce", category: "COMERCIAL", segment: "POPULAR", runFlat: false, xl: false, seal: false, tubeless: false },
  { manufacturer: "Yokohama", brand: "Yokohama", model: "BluEarth", category: "PASSEIO", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Yokohama", brand: "Yokohama", model: "Geolandar", category: "SUV", segment: "MEDIO", runFlat: false, xl: false, seal: false, tubeless: true },
  { manufacturer: "Yokohama", brand: "Yokohama", model: "Advan Sport", category: "ESPORTIVO", segment: "PREMIUM", runFlat: false, xl: true, seal: false, tubeless: true },
];

const SIZE_POOL: {
  width: number;
  profile: number;
  rim: number;
  loadIndex: string;
  speedIndex: string;
}[] = [
  { width: 175, profile: 70, rim: 13, loadIndex: "82", speedIndex: "T" },
  { width: 175, profile: 65, rim: 14, loadIndex: "82", speedIndex: "T" },
  { width: 185, profile: 65, rim: 14, loadIndex: "86", speedIndex: "T" },
  { width: 185, profile: 60, rim: 15, loadIndex: "84", speedIndex: "H" },
  { width: 195, profile: 60, rim: 15, loadIndex: "88", speedIndex: "H" },
  { width: 195, profile: 65, rim: 15, loadIndex: "91", speedIndex: "H" },
  { width: 195, profile: 55, rim: 16, loadIndex: "87", speedIndex: "V" },
  { width: 205, profile: 55, rim: 16, loadIndex: "91", speedIndex: "V" },
  { width: 205, profile: 60, rim: 16, loadIndex: "92", speedIndex: "H" },
  { width: 215, profile: 55, rim: 17, loadIndex: "93", speedIndex: "V" },
  { width: 215, profile: 60, rim: 17, loadIndex: "96", speedIndex: "H" },
  { width: 225, profile: 45, rim: 18, loadIndex: "91", speedIndex: "W" },
  { width: 225, profile: 50, rim: 18, loadIndex: "95", speedIndex: "V" },
  { width: 235, profile: 55, rim: 19, loadIndex: "101", speedIndex: "V" },
  { width: 235, profile: 60, rim: 18, loadIndex: "103", speedIndex: "H" },
  { width: 245, profile: 40, rim: 19, loadIndex: "94", speedIndex: "Y" },
  { width: 245, profile: 45, rim: 20, loadIndex: "99", speedIndex: "W" },
  { width: 265, profile: 60, rim: 18, loadIndex: "110", speedIndex: "H" },
];

function pad(value: number, length: number) {
  return String(value).padStart(length, "0");
}

function pickSlice<T>(pool: T[], offset: number, count: number): T[] {
  return Array.from(
    { length: count },
    (_, i) => pool[(offset + i) % pool.length]
  );
}

const SIZES_PER_LINE = 7;

const GENERIC_TIRES: TireSeed[] = TIRE_LINES.flatMap((line, lineIndex) => {
  const sizes = pickSlice(SIZE_POOL, lineIndex * 3, SIZES_PER_LINE);

  return sizes.map((sizeSpec, sizeIndex) => ({
    manufacturer: line.manufacturer,
    brand: line.brand,
    model: line.model,
    size: `${sizeSpec.width}/${sizeSpec.profile}R${sizeSpec.rim}`,
    width: sizeSpec.width,
    profile: sizeSpec.profile,
    rim: sizeSpec.rim,
    loadIndex: sizeSpec.loadIndex,
    speedIndex: sizeSpec.speedIndex,
    runFlat: line.runFlat,
    xl: line.xl,
    seal: line.seal,
    tubeless: line.tubeless,
    category: line.category,
    segment: line.segment,
    ean: `789${pad(lineIndex, 5)}${pad(sizeIndex, 5)}`,
    description: `${line.brand} ${line.model} ${sizeSpec.width}/${sizeSpec.profile}R${sizeSpec.rim}`,
    isActive: !(lineIndex === 18 && sizeIndex === 0),
  }));
});

type HomologationTireRef = {
  manufacturer: (typeof TIRE_MANUFACTURERS)[number]["name"];
  model: string;
  size: string;
};

type HomologationTireSeed = {
  tire: HomologationTireRef;
  role: "ORIGINAL" | "OPCIONAL";
};

type HomologationSeed = {
  code: string;
  vehicle: {
    manufacturer: (typeof MANUFACTURERS)[number];
    model: string;
    version: string;
  };
  year: number;
  notes: string | null;
  tires: HomologationTireSeed[];
};

const MANUFACTURER_CODES: Record<(typeof MANUFACTURERS)[number], string> = {
  Toyota: "T0",
  Volkswagen: "VO",
  Honda: "H0",
  BYD: "BY",
  BMW: "*",
  "Mercedes-Benz": "MO",
  Hyundai: "HY",
  Chevrolet: "CH",
  Fiat: "FI",
  Jeep: "JP",
};

// Medidas ORIGINAIS de fábrica pesquisadas em catálogos/fichas técnicas
// oficiais dos fabricantes e fontes especializadas (jantes-e-pneus.com,
// pneus.org, sites de peças originais). Códigos de homologação e a
// atribuição exata de marca/modelo de pneu em cada combinação não são
// dados regulatórios oficiais (DENATRAN/CONTRAN) — servem como
// referência até a base real de homologações ser importada.
export const REAL_HOMOLOGATION_TIRES: TireSeed[] = [
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "EP150", size: "205/55R16", width: 205, profile: 55, rim: 16, loadIndex: "91", speedIndex: "V", runFlat: false, xl: false, seal: false, tubeless: true, category: "PASSEIO", segment: "MEDIO", ean: "8990000001", description: "Bridgestone EP150 205/55R16 — original de fábrica do Toyota Corolla GLi", isActive: true },
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "Dueler H/T", size: "265/60R18", width: 265, profile: 60, rim: 18, loadIndex: "110", speedIndex: "H", runFlat: false, xl: false, seal: false, tubeless: true, category: "CAMINHONETE", segment: "PREMIUM", ean: "8990000002", description: "Bridgestone Dueler H/T 265/60R18 — original de fábrica da Toyota Hilux SRX", isActive: true },
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "Turanza ER33 MO", size: "215/50R17", width: 215, profile: 50, rim: 17, loadIndex: "91", speedIndex: "V", runFlat: false, xl: false, seal: false, tubeless: true, category: "PASSEIO", segment: "MEDIO", ean: "8990000003", description: "Bridgestone Turanza ER33 215/50R17 — original de fábrica do Toyota Corolla XEi e Honda Civic Touring", isActive: true },
  { manufacturer: "Bridgestone", brand: "Bridgestone", model: "Turanza T005 MO", size: "205/55R17", width: 205, profile: 55, rim: 17, loadIndex: "91", speedIndex: "V", runFlat: false, xl: false, seal: false, tubeless: true, category: "PASSEIO", segment: "MEDIO", ean: "8990000004", description: "Bridgestone Turanza T005 205/55R17 — original de fábrica do Volkswagen T-Cross Highline", isActive: true },
  { manufacturer: "Linglong", brand: "Linglong", model: "Comfort Master", size: "205/50R17", width: 205, profile: 50, rim: 17, loadIndex: "93", speedIndex: "W", runFlat: false, xl: true, seal: false, tubeless: true, category: "PASSEIO", segment: "MEDIO", ean: "8990000005", description: "Linglong Comfort Master 205/50R17 XL — original de fábrica do BYD Dolphin Plus", isActive: true },
  { manufacturer: "Continental", brand: "Continental", model: "SportContact 6 MO", size: "225/45R18", width: 225, profile: 45, rim: 18, loadIndex: "91", speedIndex: "Y", runFlat: true, xl: true, seal: false, tubeless: true, category: "ESPORTIVO", segment: "LUXO", ean: "8990000006", description: "Continental SportContact 6 MO 225/45R18 RunFlat — original de fábrica do BMW 320i M Sport", isActive: true },
  { manufacturer: "Continental", brand: "Continental", model: "SportContact 6 MO", size: "255/35R19", width: 255, profile: 35, rim: 19, loadIndex: "96", speedIndex: "Y", runFlat: true, xl: true, seal: false, tubeless: true, category: "ESPORTIVO", segment: "LUXO", ean: "8990000007", description: "Continental SportContact 6 MO 255/35R19 RunFlat — opcional de fábrica do BMW 320i M Sport", isActive: true },
  { manufacturer: "Continental", brand: "Continental", model: "SportContact 6", size: "225/45R17", width: 225, profile: 45, rim: 17, loadIndex: "91", speedIndex: "W", runFlat: false, xl: false, seal: false, tubeless: true, category: "ESPORTIVO", segment: "PREMIUM", ean: "8990000008", description: "Continental SportContact 6 225/45R17 — original de fábrica do Volkswagen Golf GTI", isActive: true },
  { manufacturer: "Continental", brand: "Continental", model: "SportContact 6", size: "225/40R18", width: 225, profile: 40, rim: 18, loadIndex: "92", speedIndex: "Y", runFlat: false, xl: true, seal: false, tubeless: true, category: "ESPORTIVO", segment: "PREMIUM", ean: "8990000009", description: "Continental SportContact 6 225/40R18 — opcional de fábrica do Volkswagen Golf GTI", isActive: true },
  { manufacturer: "Michelin", brand: "Michelin", model: "Latitude Sport 3 MO", size: "225/50R18", width: 225, profile: 50, rim: 18, loadIndex: "95", speedIndex: "V", runFlat: false, xl: true, seal: false, tubeless: true, category: "SUV", segment: "PREMIUM", ean: "8990000010", description: "Michelin Latitude Sport 3 MO 225/50R18 — original de fábrica do BMW X1 sDrive20i", isActive: true },
  { manufacturer: "Continental", brand: "Continental", model: "ContiSportContact 5", size: "225/45R17", width: 225, profile: 45, rim: 17, loadIndex: "91", speedIndex: "W", runFlat: false, xl: false, seal: false, tubeless: true, category: "ESPORTIVO", segment: "LUXO", ean: "8990000011", description: "Continental ContiSportContact 5 225/45R17 — original de fábrica do Mercedes-Benz C180 Avantgarde", isActive: true },
  { manufacturer: "Dunlop", brand: "Dunlop", model: "Grandtrek OE", size: "215/55R18", width: 215, profile: 55, rim: 18, loadIndex: "95", speedIndex: "V", runFlat: false, xl: false, seal: false, tubeless: true, category: "SUV", segment: "MEDIO", ean: "8990000012", description: "Dunlop Grandtrek OE 215/55R18 — original de fábrica do Hyundai Creta Ultimate", isActive: true },
  { manufacturer: "Dunlop", brand: "Dunlop", model: "Grandtrek OE", size: "215/60R17", width: 215, profile: 60, rim: 17, loadIndex: "96", speedIndex: "H", runFlat: false, xl: false, seal: false, tubeless: true, category: "SUV", segment: "MEDIO", ean: "8990000013", description: "Dunlop Grandtrek OE 215/60R17 — original de fábrica do Honda HR-V EXL", isActive: true },
  { manufacturer: "Continental", brand: "Continental", model: "ContiPowerContact 2", size: "195/55R16", width: 195, profile: 55, rim: 16, loadIndex: "87", speedIndex: "H", runFlat: false, xl: false, seal: false, tubeless: true, category: "PASSEIO", segment: "POPULAR", ean: "8990000014", description: "Continental ContiPowerContact 2 195/55R16 — original de fábrica do Chevrolet Onix Premier", isActive: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "Cinturato P7 MO", size: "205/50R17", width: 205, profile: 50, rim: 17, loadIndex: "93", speedIndex: "V", runFlat: false, xl: false, seal: false, tubeless: true, category: "PASSEIO", segment: "MEDIO", ean: "8990000015", description: "Pirelli Cinturato P7 MO 205/50R17 — original de fábrica do Fiat Pulse Impetus", isActive: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "Scorpion MO", size: "215/55R17", width: 215, profile: 55, rim: 17, loadIndex: "94", speedIndex: "V", runFlat: true, xl: true, seal: false, tubeless: true, category: "SUV", segment: "PREMIUM", ean: "8990000016", description: "Pirelli Scorpion MO 215/55R17 RunFlat — original de fábrica do Jeep Compass Longitude", isActive: true },
  { manufacturer: "Pirelli", brand: "Pirelli", model: "Scorpion MO", size: "225/55R18", width: 225, profile: 55, rim: 18, loadIndex: "98", speedIndex: "H", runFlat: true, xl: true, seal: false, tubeless: true, category: "SUV", segment: "PREMIUM", ean: "8990000017", description: "Pirelli Scorpion MO 225/55R18 RunFlat — opcional de fábrica do Jeep Compass Longitude", isActive: true },
  { manufacturer: "Goodyear", brand: "Goodyear", model: "EfficientGrip SUV", size: "235/50R19", width: 235, profile: 50, rim: 19, loadIndex: "103", speedIndex: "V", runFlat: false, xl: true, seal: false, tubeless: true, category: "SUV", segment: "PREMIUM", ean: "8990000018", description: "Goodyear EfficientGrip SUV 235/50R19 XL — original de fábrica do BYD Song Plus Premium", isActive: true },
  { manufacturer: "Goodyear", brand: "Goodyear", model: "EfficientGrip SUV", size: "235/55R18", width: 235, profile: 55, rim: 18, loadIndex: "100", speedIndex: "V", runFlat: false, xl: true, seal: false, tubeless: true, category: "SUV", segment: "PREMIUM", ean: "8990000019", description: "Goodyear EfficientGrip SUV 235/55R18 XL — opcional de fábrica do BYD Song Plus Premium", isActive: true },
  { manufacturer: "Goodyear", brand: "Goodyear", model: "EfficientGrip SUV", size: "245/45R20", width: 245, profile: 45, rim: 20, loadIndex: "103", speedIndex: "W", runFlat: false, xl: true, seal: false, tubeless: true, category: "SUV", segment: "PREMIUM", ean: "8990000020", description: "Goodyear EfficientGrip SUV 245/45R20 XL — opcional de fábrica do BYD Song Plus Premium", isActive: true },
];

export const TIRES: TireSeed[] = [...GENERIC_TIRES, ...REAL_HOMOLOGATION_TIRES];

function tireRef(size: string, tire: TireSeed): HomologationTireRef {
  if (tire.size !== size) {
    throw new Error(`Tamanho inesperado para ${tire.model}: ${tire.size} != ${size}`);
  }
  return { manufacturer: tire.manufacturer, model: tire.model, size: tire.size };
}

function findRealTire(model: string, size: string): HomologationTireRef {
  const tire = REAL_HOMOLOGATION_TIRES.find(
    (t) => t.model === model && t.size === size
  );
  if (!tire) {
    throw new Error(`Pneu real não encontrado: ${model} ${size}`);
  }
  return tireRef(size, tire);
}

type VehicleHomologationSpec = {
  vehicleKey: string;
  year: number;
  original: { model: string; size: string };
  optionals?: { model: string; size: string }[];
  source: string;
};

// Uma homologação por veículo, com a medida ORIGINAL pesquisada em fonte
// real (ver `source`). Medidas opcionais só são incluídas quando a fonte
// confirmou explicitamente uma segunda opção de fábrica.
const VEHICLE_HOMOLOGATION_SPECS: VehicleHomologationSpec[] = [
  { vehicleKey: "Toyota|Corolla|XEi", year: 2024, original: { model: "Turanza ER33 MO", size: "215/50R17" }, source: "Ficha técnica Toyota Corolla 2024 (toyotacomunica.com.br) e carrosnaweb.com.br" },
  { vehicleKey: "Toyota|Corolla|GLi", year: 2023, original: { model: "EP150", size: "205/55R16" }, source: "Anúncio de peça original Toyota (gopneus.com.br) e mundodoautomovelparapcd.com.br" },
  { vehicleKey: "Toyota|Hilux|SRX", year: 2024, original: { model: "Dueler H/T", size: "265/60R18" }, source: "Ficha técnica oficial Toyota Hilux 2024 (toyotacomunica.com.br)" },
  { vehicleKey: "Volkswagen|Golf|GTI", year: 2022, original: { model: "SportContact 6", size: "225/45R17" }, optionals: [{ model: "SportContact 6", size: "225/40R18" }], source: "motorshow.com.br (avaliação) e jantes-e-pneus.com" },
  { vehicleKey: "Volkswagen|T-Cross|Highline", year: 2024, original: { model: "Turanza T005 MO", size: "205/55R17" }, source: "Ficha técnica oficial VW T-Cross Highline 250 TSI (vw-digital-cdn-br.itd.vw.com.br)" },
  { vehicleKey: "Honda|Civic|Touring", year: 2023, original: { model: "Turanza ER33 MO", size: "215/50R17" }, source: "Catálogo de peças Honda (honda.com.br) e jantes-e-pneus.com" },
  { vehicleKey: "Honda|HR-V|EXL", year: 2024, original: { model: "Grandtrek OE", size: "215/60R17" }, source: "mundodoautomovelparapcd.com.br e jantes-e-pneus.com" },
  { vehicleKey: "BYD|Dolphin|Plus", year: 2024, original: { model: "Comfort Master", size: "205/50R17" }, source: "velocepneus.com (peça original) e rodasdeligaleve.com.br" },
  { vehicleKey: "BYD|Song Plus|Premium", year: 2024, original: { model: "EfficientGrip SUV", size: "235/50R19" }, optionals: [{ model: "EfficientGrip SUV", size: "235/55R18" }, { model: "EfficientGrip SUV", size: "245/45R20" }], source: "byd.com/br (página oficial) e rodasdeligaleve.com.br" },
  { vehicleKey: "BMW|320i|M Sport", year: 2023, original: { model: "SportContact 6 MO", size: "225/45R18" }, optionals: [{ model: "SportContact 6 MO", size: "255/35R19" }], source: "Ficha técnica oficial BMW do Brasil (press.bmwgroup.com/brazil)" },
  { vehicleKey: "BMW|X1|sDrive20i", year: 2024, original: { model: "Latitude Sport 3 MO", size: "225/50R18" }, source: "carrosnaweb.com.br e pneusmalibu.com.br" },
  { vehicleKey: "Mercedes-Benz|C180|Avantgarde", year: 2023, original: { model: "ContiSportContact 5", size: "225/45R17" }, source: "tireshop.com.br (marcação MO de equipamento original) e gutierrezpneus.com.br" },
  { vehicleKey: "Hyundai|Creta|Ultimate", year: 2024, original: { model: "Grandtrek OE", size: "215/55R18" }, source: "forumcarros.com.br e magodoscarros.com (ficha técnica 2.0 16V Flex Aut.)" },
  { vehicleKey: "Chevrolet|Onix|Premier", year: 2023, original: { model: "ContiPowerContact 2", size: "195/55R16" }, source: "blog.acheipneus.com.br (pneu original Onix) e pneusmalibu.com.br" },
  { vehicleKey: "Fiat|Pulse|Impetus", year: 2024, original: { model: "Cinturato P7 MO", size: "205/50R17" }, source: "2peneus.com.br e pneusmalibu.com.br" },
  { vehicleKey: "Jeep|Compass|Longitude", year: 2023, original: { model: "Scorpion MO", size: "215/55R17" }, optionals: [{ model: "Scorpion MO", size: "225/55R18" }], source: "pirelli.com.br (catálogo Compass III Longitude) e jantes-e-pneus.com" },
];

export const HOMOLOGATIONS: HomologationSeed[] = VEHICLE_HOMOLOGATION_SPECS.map(
  (spec) => {
    const [manufacturer, model, version] = spec.vehicleKey.split("|") as [
      (typeof MANUFACTURERS)[number],
      string,
      string,
    ];

    const original = findRealTire(spec.original.model, spec.original.size);
    const optionals = (spec.optionals ?? []).map((o) =>
      findRealTire(o.model, o.size)
    );

    return {
      code: MANUFACTURER_CODES[manufacturer],
      vehicle: { manufacturer, model, version },
      year: spec.year,
      notes: `Medida original de fábrica. Fonte: ${spec.source}.`,
      tires: [
        { tire: original, role: "ORIGINAL" as const },
        ...optionals.map((tire) => ({ tire, role: "OPCIONAL" as const })),
      ],
    };
  }
);
