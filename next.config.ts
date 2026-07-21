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
  // sharp is used directly (not just via next/image's built-in optimizer) by
  // app/api/digimon/[id]/image/route.ts. serverExternalPackages keeps it
  // unbundled so Next's automatic file tracing (@vercel/nft) can resolve
  // sharp's own require()/import() graph — same fix pokemon/next.config.ts
  // already needed for the same library.
  serverExternalPackages: ["sharp"],
  // What nft's require-graph tracing CANNOT see: sharp's Linux native binding
  // loads libvips-cpp.so via dlopen() at runtime, not via require(), so it's
  // invisible to static tracing (ERR_DLOPEN_FAILED in prod logs otherwise —
  // this exact failure is documented in pokemon/docs/development-notes.md
  // for the sibling project using the same library).
  //
  // These two package names/versions are NOT copied blindly from pokemon/:
  // verified directly against this project's own pnpm-lock.yaml, which
  // already lists them as resolved optional dependencies of sharp@0.34.5
  // (@img/sharp-linux-x64@0.34.5, @img/sharp-libvips-linux-x64@1.2.4) even
  // though only the Windows build is physically present in local
  // node_modules today. The version in the glob is a wildcard on purpose, so
  // this keeps working if `sharp` gets bumped later without editing this file.
  outputFileTracingIncludes: {
    "/api/digimon/[id]/image/**": [
      "./node_modules/.pnpm/@img+sharp-linux-x64@*/node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/.pnpm/@img+sharp-libvips-linux-x64@*/node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },
};

export default nextConfig;
