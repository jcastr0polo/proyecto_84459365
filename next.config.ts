import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // Sistema transaccional: CERO caché en TODAS las API responses.
  // Esto se aplica a nivel de infraestructura (Vercel CDN) como safety net.
  // withAuth() también lo pone por route, pero esto cubre rutas sin auth.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
        ],
      },
    ];
  },
};

export default nextConfig;
