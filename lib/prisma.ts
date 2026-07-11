import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

declare global {
  var __homologaPneuPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL ?? "file:./dev.db",
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__homologaPneuPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__homologaPneuPrisma = prisma;
}
