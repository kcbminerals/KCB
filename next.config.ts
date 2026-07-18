import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Small static logo only — skip the on-demand optimizer (which needs
    // `sharp` installed) rather than adding that dependency for one asset.
    unoptimized: true,
  },
};

export default nextConfig;
