/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable type checking in production build based on environment variable
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: process.env.SKIP_TYPE_CHECK === '1',
  },
  eslint: {
    // Disable ESLint during builds
    ignoreDuringBuilds: true,
  },
  
  /* config options from next.config.ts */
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

module.exports = nextConfig;
