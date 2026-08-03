import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,
  images: {
    unoptimized: false,
    domains: ['upload.wikimedia.org', 'commons.wikimedia.org'],
    formats: ['image/webp', 'image/avif'],
  },
  onDemandEntries: {
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 50,
  },
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'public, s-maxage=3600, stale-while-revalidate=86400' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
      ],
    },
  ],
  telemetry: false,
}

export default nextConfig
