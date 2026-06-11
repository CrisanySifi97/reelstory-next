import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return [
      { source: '/catalog', destination: '/explorar', permanent: true },
    ]
  },
};

export default nextConfig;
