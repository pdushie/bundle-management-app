import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  poweredByHeader: false,
  reactStrictMode: true,
  
  // Improve mobile performance
  images: {
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60
  },
  
  // Compress responses
  compress: true,
  
  // Allow PWA features
  headers: async () => {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          }
        ],
      },
    ]
  }
};

export default nextConfig;
