import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * El taller de diseño (/prototype) solo existe en desarrollo.
   *
   * Sus páginas se llaman `page.dev.tsx`, y esa extensión solo entra en
   * pageExtensions fuera de producción. Antes se compilaban las 19 y se
   * desplegaban: devolvían 404 por el guard del layout, pero seguían
   * gastando tiempo de build y ocupando sitio en el manifiesto de rutas.
   * Así el build de producción ni las ve.
   */
  pageExtensions: process.env.NODE_ENV === 'production'
    ? ['tsx', 'ts']
    : ['dev.tsx', 'tsx', 'ts'],

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
