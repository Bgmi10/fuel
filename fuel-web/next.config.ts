import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["https://bright-regions-shout.loca.lt", "https://puny-donuts-work.loca.lt", "https://puny-worlds-stare.loca.lt", "https://seven-guests-kick.loca.lt", "https://new-insects-dig.loca.lt"],

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;