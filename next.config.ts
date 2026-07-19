import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "digi-api.com",
        pathname: "/images/**",
      },
    ],
  },
};

export default nextConfig;
