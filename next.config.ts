import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // pdf-parse (v2) uses pdfjs-dist, which loads a worker module at runtime.
  // Bundling it into the server output breaks that worker path
  // ("Cannot find .next/server/chunks/pdf.worker.mjs"). Keeping it external
  // makes Next require it from node_modules at runtime, where the worker
  // resolves — so PDF text extraction works in the import-pdf and upload-cv
  // routes.
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
