import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  serverExternalPackages: ['better-sqlite3', 'playwright', '@playwright/test', 'pdf-parse', 'pdfjs-dist'],
};

export default nextConfig;
