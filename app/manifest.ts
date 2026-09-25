import type { MetadataRoute } from 'next';

/**
 * Manifiesto — para cuando alguien añade NEXUS a la pantalla de inicio.
 *
 * Los dos juegos de iconos no sobran: Android recorta el icono con la forma
 * que decida el fabricante (círculo, cuadrado, gota), y solo respeta el margen
 * de seguridad en los marcados como "maskable". Sin ellos, la N sale cortada
 * en media gama de teléfonos.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NEXUS — Plataforma Académica',
    short_name: 'NEXUS',
    description:
      'Actividades, entregas, parciales y notas de tus cursos, en un solo sitio.',
    start_url: '/',
    display: 'standalone',
    /* El mismo fondo que pinta la aplicación al arrancar: si no coinciden, se
       ve un destello blanco antes de que cargue. */
    background_color: '#0d1117',
    theme_color: '#0d1117',
    lang: 'es',
    icons: [
      { src: '/iconos/nexus-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/iconos/nexus-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/iconos/nexus-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/iconos/nexus-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
