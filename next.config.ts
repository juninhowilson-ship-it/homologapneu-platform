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
    // Otimizações de performance
    optimizePackageImports: ["@prisma/client", "recharts", "lucide-react"],
  },
  // Compressão e otimizações de resposta
  compress: true,
  poweredByHeader: false,

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
      // Cache control headers para rotas estáticas
      {
        source: "/api/fabricantes/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600",
          },
        ],
      },
      {
        source: "/api/medidas/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=1209600",
          },
        ],
      },
      {
        source: "/api/dashboard",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
      // Imagens com cache longo
      {
        source: "/api/media/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, immutable",
          },
        ],
      },
      // Dados dinâmicos sem cache
      {
        source: "/api/homologacoes/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate, max-age=0",
          },
        ],
      },
      {
        source: "/api/curadoria/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate, max-age=0",
          },
        ],
      },
    ];
  },

  // Rewrite para suportar ISR e SSG
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // Otimizações de imagem
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 604800, // 7 days
  },
};

export default nextConfig;
