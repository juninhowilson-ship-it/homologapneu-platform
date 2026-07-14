import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Timestamp real de quando este build foi compilado — usado na página
  // /status como "data do deploy" (Vercel não expõe esse valor em runtime).
  env: {
    BUILD_TIME: new Date().toISOString(),
  },
};

export default nextConfig;
