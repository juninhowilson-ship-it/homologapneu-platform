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
  // Headers de segurança básicos, aplicados a toda resposta. Content-Security-Policy
  // foi deliberadamente deixado de fora aqui: uma CSP estrita exige nonce por
  // request (script/style inline do Next.js) e testes extensivos para não quebrar
  // a aplicação — ver relatório de auditoria de segurança para essa recomendação.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // SAMEORIGIN (não DENY): /dev embute miniaturas de outras páginas
          // internas via <iframe> same-origin (components/dev/ScreenshotPreview.tsx)
          // — DENY quebraria essa funcionalidade. SAMEORIGIN já bloqueia o
          // clickjacking entre domínios, que é o risco real deste header.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
