import "server-only";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __homologaPneuPrisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });

  return new PrismaClient({ adapter });
}

export const prisma = globalThis.__homologaPneuPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__homologaPneuPrisma = prisma;
}
