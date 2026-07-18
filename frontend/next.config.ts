import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  env: {
    // Expose at build AND runtime — reads from process.env injected by Docker
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1',
  },
};

export default nextConfig;
