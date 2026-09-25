/**
 * Tarjeta de 1200x630 para cuando alguien pega el enlace en WhatsApp, Slack o
 * una red social.
 *
 *   node tools/marca/generar-og.mjs
 *
 * Estática con sharp y no con ImageResponse: no cambia nunca, así que no hay
 * razón para renderizarla en cada petición.
 *
 * Aviso: la palabra "NEXUS" va en Georgia, no en Playfair. Playfair la
 * descarga next/font en tiempo de compilación a un .woff2 con nombre
 * cambiante dentro de .next, y librsvg necesita la fuente instalada en el
 * sistema, no una ruta. Georgia es también un serif de contraste alto y el
 * resultado queda cocido en el PNG, así que se ve igual para todo el mundo.
 */
import sharp from 'sharp';
import fs from 'node:fs';

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="fondo" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d1117"/>
      <stop offset="1" stop-color="#111a2b"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.5" cy="0.1" r="0.7">
      <stop offset="0" stop-color="#22d3ee" stop-opacity="0.16"/>
      <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#22d3ee"/>
      <stop offset="1" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#fondo)"/>
  <rect width="1200" height="630" fill="url(#halo)"/>

  <!-- la marca, a 112px -->
  <g transform="translate(96 150) scale(3.5)">
    <rect width="32" height="32" rx="7" fill="url(#g)"/>
    <g stroke="#ffffff" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <path d="M8.6 24.4 V 7.6"/><path d="M8.6 7.6 L 23.4 24.4"/><path d="M23.4 24.4 V 7.6"/>
    </g>
    <circle cx="8.6" cy="7.6" r="3.3" fill="#ffffff"/>
    <circle cx="23.4" cy="24.4" r="3.3" fill="#ffffff"/>
  </g>

  <text x="240" y="232" font-family="Georgia, 'Times New Roman', serif" font-size="104" font-weight="700" fill="#f8fafc">NEXUS</text>
  <text x="98" y="352" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="#cbd5e1">Plataforma Académica</text>
  <text x="98" y="416" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#94a3b8">Actividades, entregas, parciales y notas de tus cursos,</text>
  <text x="98" y="458" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="#94a3b8">en un solo sitio.</text>

  <rect x="98" y="520" width="140" height="4" rx="2" fill="url(#g)"/>
  <text x="98" y="574" font-family="Helvetica, Arial, sans-serif" font-size="24" fill="#64748b">Next.js · TypeScript · Supabase</text>
</svg>`;

fs.writeFileSync('app/opengraph-image.png',
  await sharp(Buffer.from(svg), { density: 144 }).resize(1200, 630).png({ compressionLevel: 9 }).toBuffer());
const kb = (fs.statSync('app/opengraph-image.png').size / 1024).toFixed(0);
console.log(`app/opengraph-image.png  ${kb} KB`);
if (+kb > 300) console.log('⚠ pesa mucho para una previsualización');
