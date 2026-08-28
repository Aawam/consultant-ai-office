import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@consultant-ai-office/application",
    "@consultant-ai-office/shared-contracts",
  ],
};

export default nextConfig;
