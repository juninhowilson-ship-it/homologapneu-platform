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
  { manufacturer: "Volkswagen", model: "Golf", version: "GTI", yearStart: 2022, yearEnd: 2023, engine: "1.4 TSI", power: "150cv", fuel: "FLEX", category: "HATCH", segment: "PREMIUM", country: "Alemanha", notes: "Versão importada, produção encerrada no Brasil.", isActive: true },
  { manufacturer: "Volkswagen", model: "T-Cross", version: "Highline", yearStart: 2024, yearEnd: 2025, engine: "1.0 TSI", power: "116cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Honda", model: "Civic", version: "Touring", yearStart: 2023, yearEnd: 2024, engine: "2.0", power: "155cv", fuel: "FLEX", category: "SEDAN", segment: "PREMIUM", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "Honda", model: "HR-V", version: "EXL", yearStart: 2024, yearEnd: 2025, engine: "1.5 Turbo", power: "177cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
  { manufacturer: "BYD", model: "Dolphin", version: "Plus", yearStart: 2024, yearEnd: 2025, engine: "Elétrico", power: "204cv", fuel: "ELETRICO", category: "HATCH", segment: "MEDIO", country: "China", notes: null, isActive: true },
  { manufacturer: "BYD", model: "Song Plus", version: "Premium", yearStart: 2024, yearEnd: 2025, engine: "Híbrido", power: "223cv", fuel: "HIBRIDO", category: "SUV", segment: "PREMIUM", country: "China", notes: null, isActive: true },
  { manufacturer: "BMW", model: "320i", version: "M Sport", yearStart: 2023, yearEnd: 2024, engine: "2.0 Turbo", power: "184cv", fuel: "GASOLINA", category: "SEDAN", segment: "LUXO", country: "Alemanha", notes: "Versão descontinuada após atualização da geração.", isActive: false },
  { manufacturer: "BMW", model: "X1", version: "sDrive20i", yearStart: 2024, yearEnd: 2025, engine: "2.0 Turbo", power: "170cv", fuel: "GASOLINA", category: "SUV", segment: "LUXO", country: "Alemanha", notes: null, isActive: true },
  { manufacturer: "Mercedes-Benz", model: "C180", version: "Avantgarde", yearStart: 2023, yearEnd: 2024, engine: "1.5 Turbo", power: "156cv", fuel: "GASOLINA", category: "SEDAN", segment: "LUXO", country: "Alemanha", notes: null, isActive: true },
  { manufacturer: "Hyundai", model: "Creta", version: "Ultimate", yearStart: 2024, yearEnd: 2025, engine: "1.0 Turbo", power: "120cv", fuel: "FLEX", category: "SUV", segment: "MEDIO", country: "Brasil", notes: null, isActive: true },
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

export const TIRES: TireSeed[] = TIRE_LINES.flatMap((line, lineIndex) => {
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

// Faixa de aro compatível com o porte/categoria do veículo, para evitar
// combinações irreais (ex.: SUV com pneu de aro 14).
const RIM_RANGE_BY_VEHICLE_CATEGORY: Record<VehicleSeed["category"], [number, number]> = {
  HATCH: [14, 16],
  SEDAN: [15, 17],
  SUV: [17, 19],
  PICAPE: [17, 20],
  PERUA: [15, 17],
  MINIVAN: [15, 17],
  COUPE: [18, 20],
};

const TIRE_CATEGORIES_BY_VEHICLE_CATEGORY: Record<
  VehicleSeed["category"],
  TireCategoryValue[]
> = {
  HATCH: ["PASSEIO", "ESPORTIVO"],
  SEDAN: ["PASSEIO", "ESPORTIVO"],
  SUV: ["SUV", "PASSEIO"],
  PICAPE: ["CAMINHONETE", "SUV"],
  PERUA: ["PASSEIO", "SUV"],
  MINIVAN: ["PASSEIO"],
  COUPE: ["ESPORTIVO", "PASSEIO"],
};

function tiresForVehicle(vehicle: VehicleSeed): TireSeed[] {
  const [minRim, maxRim] = RIM_RANGE_BY_VEHICLE_CATEGORY[vehicle.category];
  const preferredCategories = TIRE_CATEGORIES_BY_VEHICLE_CATEGORY[vehicle.category];

  const byRimAndCategory = TIRES.filter(
    (tire) =>
      tire.rim >= minRim &&
      tire.rim <= maxRim &&
      preferredCategories.includes(tire.category)
  );

  if (byRimAndCategory.length >= 2) return byRimAndCategory;

  // Fallback: relaxa a categoria do pneu, mas nunca o aro compatível.
  return TIRES.filter((tire) => tire.rim >= minRim && tire.rim <= maxRim);
}

function tireRef(tire: TireSeed): HomologationTireRef {
  return { manufacturer: tire.manufacturer, model: tire.model, size: tire.size };
}

export const HOMOLOGATIONS: HomologationSeed[] = VEHICLES.flatMap(
  (vehicle, vehicleIndex) => {
    const baseCode = MANUFACTURER_CODES[vehicle.manufacturer];
    const pool = tiresForVehicle(vehicle);
    // A maioria dos veículos tem uma homologação; alguns têm uma segunda
    // (revisão/recertificação), variando os dados sem inflar o cadastro.
    const revisionCount = vehicleIndex % 3 === 0 ? 2 : 1;
    const yearRange = vehicle.yearEnd - vehicle.yearStart + 1;

    return Array.from({ length: revisionCount }, (_, revisionIndex) => {
      const offset = (vehicleIndex * 3 + revisionIndex * 2) % pool.length;
      const original = pool[offset];

      const optionalCandidates = pool.filter(
        (tire) => tire.size !== original.size
      );
      const optionalTarget = optionalCandidates.length === 0 ? 0 : revisionIndex === 0 ? 2 : 1;

      const optionals: TireSeed[] = [];
      for (
        let i = 0;
        i < optionalCandidates.length && optionals.length < optionalTarget;
        i++
      ) {
        const candidate =
          optionalCandidates[(offset + i + 1) % optionalCandidates.length];
        if (!optionals.some((picked) => picked.size === candidate.size)) {
          optionals.push(candidate);
        }
      }

      return {
        code: revisionIndex === 0 ? baseCode : `${baseCode}-R${revisionIndex + 1}`,
        vehicle: {
          manufacturer: vehicle.manufacturer,
          model: vehicle.model,
          version: vehicle.version,
        },
        year: vehicle.yearStart + (revisionIndex % yearRange),
        notes:
          revisionIndex === 0
            ? "Medida original de fábrica."
            : "Revisão de homologação.",
        tires: [
          { tire: tireRef(original), role: "ORIGINAL" as const },
          ...optionals.map((tire) => ({
            tire: tireRef(tire),
            role: "OPCIONAL" as const,
          })),
        ],
      };
    });
  }
);
