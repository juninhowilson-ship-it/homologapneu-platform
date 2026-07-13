import path from "node:path";
import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations/introspection use the direct (non-pooled) connection.
    // The app runtime (lib/prisma.ts, prisma/seed.ts) uses DATABASE_URL.
    url: env("DIRECT_URL"),
  },
});
