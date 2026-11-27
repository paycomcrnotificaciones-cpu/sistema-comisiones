import type { NextConfig } from "next";

// Configuración de Next.js.
// cacheComponents y partialPrefetching hacen que las pantallas carguen más
// rápido; el bloque de turbopack sirve para que Tailwind procese el CSS.
const nextConfig: NextConfig = {
  devIndicators: false,
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Permite que el CLI avise de actualizaciones de seguridad de Next.
    agentUpgrade: "security",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
