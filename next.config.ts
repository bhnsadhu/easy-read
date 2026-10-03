import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native/WASM-backed packages must not be bundled into server chunks.
  serverExternalPackages: ["@electric-sql/pglite", "postgres", "sharp", "unpdf", "@anthropic-ai/sdk"],
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL ? [{ protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname }] : [],
  },
  poweredByHeader: false,
};

export default nextConfig;
