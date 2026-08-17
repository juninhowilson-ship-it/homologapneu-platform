import path from "node:path";
import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations/introspection usam a conexão direta (não-pooled); o runtime
    // da aplicação (lib/prisma.ts, prisma/seed.ts) usa DATABASE_URL.
    //
    // Cai para DATABASE_URL quando DIRECT_URL não existe: `prisma generate`
    // roda no build e não precisa de conexão real, mas o config antigo
    // exigia DIRECT_URL e derrubava o build de quem só define DATABASE_URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "",
  },
});
