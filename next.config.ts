import type { NextConfig } from "next";

// NOTA: @ducanh2912/next-pwa no es compatible con Next 16 + Turbopack.
// El SW está escrito a mano en /public/sw.js y se registra desde
// components/PwaInit.tsx. El manifest.json sigue siendo servido normal.

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {},
};

export default nextConfig;
