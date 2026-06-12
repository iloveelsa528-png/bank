import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['better-sqlite3', 'playwright', '@playwright/test'],
};

export default nextConfig;
