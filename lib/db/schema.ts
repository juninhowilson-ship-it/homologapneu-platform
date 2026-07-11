export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS manufacturers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS tire_manufacturers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  country TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  manufacturer_id INTEGER NOT NULL REFERENCES manufacturers(id),
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  engine TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tire_manufacturer_id INTEGER NOT NULL REFERENCES tire_manufacturers(id),
  model TEXT NOT NULL,
  size TEXT NOT NULL,
  load_index TEXT NOT NULL,
  speed_index TEXT NOT NULL,
  run_flat INTEGER NOT NULL DEFAULT 0,
  xl INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS homologations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  tire_id INTEGER NOT NULL REFERENCES tires(id)
);

CREATE INDEX IF NOT EXISTS idx_vehicles_manufacturer ON vehicles(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_tires_manufacturer ON tires(tire_manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_homologations_vehicle ON homologations(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_homologations_tire ON homologations(tire_id);
`;
