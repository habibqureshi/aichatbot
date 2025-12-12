import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb", // Increase limit from 1MB to 10MB
    },
  },
  staticPageGenerationTimeout: 120,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
