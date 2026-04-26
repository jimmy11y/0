import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    // Suppress the parquetjs module not found warning from together-ai
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        parquetjs: false,
      };
    }
    // Ignore the parquetjs import entirely
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push('parquetjs');
    }
    return config;
  },
};

export default nextConfig;
