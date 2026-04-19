import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ffmpeg-installer/ffmpeg uses __dirname to locate its bundled binary in
  // node_modules. Webpack bundling rewrites __dirname and breaks the lookup,
  // so tell Next.js to leave this package external at runtime.
  serverExternalPackages: ["@ffmpeg-installer/ffmpeg"],
};

export default nextConfig;
