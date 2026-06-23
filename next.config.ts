import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Required so that `next dev` can resolve the Cloudflare D1 binding (`env.DB`)
// via `getCloudflareContext()` from `src/lib/db.ts`. Without this, every server
// action that hits the DB throws 500 with digest 634347044 on localhost.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
  transpilePackages: [
    "@mui/material",
    "@mui/icons-material",
    "@mui/x-data-grid",
    "@mui/system",
    "@mui/styled-engine",
  ],
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-d1", "@prisma/adapter-better-sqlite3", "better-sqlite3"],
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    return config;
  },
};

export default nextConfig;
