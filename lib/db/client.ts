import "server-only";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { SCHEMA_SQL } from "./schema";
import { seed } from "./seed";

const DB_PATH = join(process.cwd(), ".data", "homologapneu.sqlite");

declare global {
  var __homologaPneuDb: DatabaseSync | undefined;
}

function createDatabase(): DatabaseSync {
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(DB_PATH);
  db.exec(SCHEMA_SQL);

  const { count } = db
    .prepare("SELECT COUNT(*) as count FROM homologations")
    .get() as { count: number };

  if (count === 0) {
    seed(db);
  }

  return db;
}

export function getDb(): DatabaseSync {
  if (!globalThis.__homologaPneuDb) {
    globalThis.__homologaPneuDb = createDatabase();
  }

  return globalThis.__homologaPneuDb;
}
