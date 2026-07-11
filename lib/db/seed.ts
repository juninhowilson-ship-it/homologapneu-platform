import type { DatabaseSync } from "node:sqlite";
import {
  MANUFACTURERS,
  TIRE_MANUFACTURERS,
  VEHICLES,
  TIRES,
  HOMOLOGATIONS,
} from "./seedData";

export function seed(db: DatabaseSync) {
  db.exec("BEGIN");

  try {
    const insertManufacturer = db.prepare(
      "INSERT INTO manufacturers (name) VALUES (?)"
    );
    const manufacturerIds = new Map<string, number>();
    for (const name of MANUFACTURERS) {
      const result = insertManufacturer.run(name);
      manufacturerIds.set(name, Number(result.lastInsertRowid));
    }

    const insertTireManufacturer = db.prepare(
      "INSERT INTO tire_manufacturers (name, country) VALUES (?, ?)"
    );
    const tireManufacturerIds = new Map<string, number>();
    for (const tireManufacturer of TIRE_MANUFACTURERS) {
      const result = insertTireManufacturer.run(
        tireManufacturer.name,
        tireManufacturer.country
      );
      tireManufacturerIds.set(
        tireManufacturer.name,
        Number(result.lastInsertRowid)
      );
    }

    const insertVehicle = db.prepare(
      "INSERT INTO vehicles (manufacturer_id, model, year, engine) VALUES (?, ?, ?, ?)"
    );
    const vehicleIds = new Map<string, number>();
    for (const vehicle of VEHICLES) {
      const manufacturerId = manufacturerIds.get(vehicle.manufacturer);
      if (!manufacturerId) continue;
      const result = insertVehicle.run(
        manufacturerId,
        vehicle.model,
        vehicle.year,
        vehicle.engine
      );
      vehicleIds.set(
        `${vehicle.manufacturer}|${vehicle.model}|${vehicle.year}`,
        Number(result.lastInsertRowid)
      );
    }

    const insertTire = db.prepare(
      "INSERT INTO tires (tire_manufacturer_id, model, size, load_index, speed_index, run_flat, xl) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    const tireIds = new Map<string, number>();
    for (const tire of TIRES) {
      const tireManufacturerId = tireManufacturerIds.get(tire.manufacturer);
      if (!tireManufacturerId) continue;
      const result = insertTire.run(
        tireManufacturerId,
        tire.model,
        tire.size,
        tire.loadIndex,
        tire.speedIndex,
        tire.runFlat ? 1 : 0,
        tire.xl ? 1 : 0
      );
      tireIds.set(
        `${tire.manufacturer}|${tire.model}|${tire.size}`,
        Number(result.lastInsertRowid)
      );
    }

    const insertHomologation = db.prepare(
      "INSERT INTO homologations (code, vehicle_id, tire_id) VALUES (?, ?, ?)"
    );
    for (const homologation of HOMOLOGATIONS) {
      const vehicleId = vehicleIds.get(
        `${homologation.vehicle.manufacturer}|${homologation.vehicle.model}|${homologation.vehicle.year}`
      );
      const tireId = tireIds.get(
        `${homologation.tire.manufacturer}|${homologation.tire.model}|${homologation.tire.size}`
      );
      if (!vehicleId || !tireId) continue;
      insertHomologation.run(homologation.code, vehicleId, tireId);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
