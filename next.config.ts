import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Timestamp real de quando este build foi compilado — usado na página
  // /status como "data do deploy" (Vercel não expõe esse valor em runtime).
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
  // O proxy.ts (todo request passa por ele) bufferiza o corpo da requisição
  // até este limite (padrão: 10MB) — manuais oficiais em PDF (Curadoria
  // Inteligente, /api/curadoria/upload) chegam a ~100MB.
  experimental: {
    proxyClientMaxBodySize: "150mb",
  },
};

export default nextConfig;
