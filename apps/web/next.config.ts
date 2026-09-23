import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
