import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Performance optimizations */
  reactStrictMode: false, // Prevent double-rendering in dev mode
  poweredByHeader: false, // Remove X-Powered-By header
  
  // Optimize Firebase imports — tree-shake unused modules
  experimental: {
    optimizePackageImports: ["firebase/app", "firebase/auth", "firebase/firestore"],
  },
};

export default nextConfig;
