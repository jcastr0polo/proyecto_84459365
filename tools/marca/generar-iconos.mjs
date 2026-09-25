/**
 * Genera todo el juego de iconos desde app/icon.svg.
 *
 *   node tools/marca/generar-iconos.mjs
 *
 * app/icon.svg es la ÚNICA fuente: el favicon, el icono de iOS, los del
 * manifiesto y la tarjeta al compartir salen todos de ahí, así que no pueden
 * acabar enseñando dibujos distintos. Si cambias la marca, cambia ese fichero
 * y vuelve a correr esto.
 *
 * (components/ui/NexusMark.tsx repite la geometría en JSX porque el logotipo
 * de la aplicación va en línea. tools/marca/comprobar-marca.mjs verifica que
 * los dos no se hayan separado.)
 *
 * Necesita sharp, que ya está en el proyecto.
 */
import sharp from 'sharp';
import fs from 'node:fs';

const FUENTE = 'app/icon.svg';
const svg = fs.readFileSync(FUENTE, 'utf8');
const png = (fuente, s, fondo) => {
  let t = sharp(Buffer.from(fuente), { density: 512 }).resize(s, s);
  if (fondo) t = t.flatten({ background: fondo });
  return t.png({ compressionLevel: 9 }).toBuffer();
};

/* ICO a mano: cabecera de 6 bytes, 16 por entrada, y desde Vista el payload
   puede ser un PNG tal cual. Tres tamaños no justifican otra dependencia. */
function construirIco(imagenes) {
  const cab = Buffer.alloc(6);
  cab.writeUInt16LE(1, 2);
  cab.writeUInt16LE(imagenes.length, 4);
  const dir = Buffer.alloc(16 * imagenes.length);
  let off = 6 + 16 * imagenes.length;
  imagenes.forEach(({ size, data }, i) => {
    const b = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, b);
    dir.writeUInt8(size >= 256 ? 0 : size, b + 1);
    dir.writeUInt16LE(1, b + 4);
    dir.writeUInt16LE(32, b + 6);
    dir.writeUInt32LE(data.length, b + 8);
    dir.writeUInt32LE(off, b + 12);
    off += data.length;
  });
  return Buffer.concat([cab, dir, ...imagenes.map((i) => i.data)]);
}

/* iOS pinta NEGRO donde el icono sea transparente y le pone su propia máscara
   redondeada, así que su versión va a sangre. */
const aSangre = svg.replace('rx="7"', 'rx="0"');

/* Android recorta con la forma que decida el fabricante —círculo, cuadrado,
   gota—: solo el 80% central está garantizado. La marca se encoge para que no
   le corten la N. */
const conMargen = aSangre
  .replace('<g stroke=', '<g transform="translate(16 16) scale(0.72) translate(-16 -16)" stroke=')
  .replace(/<circle /g, '<circle transform="translate(16 16) scale(0.72) translate(-16 -16)" ');

fs.writeFileSync('app/favicon.ico', construirIco(
  await Promise.all([16, 32, 48].map(async (s) => ({ size: s, data: await png(svg, s) })))));
fs.writeFileSync('app/apple-icon.png', await png(aSangre, 180, '#22d3ee'));

fs.mkdirSync('public/iconos', { recursive: true });
for (const s of [192, 512]) {
  fs.writeFileSync(`public/iconos/nexus-${s}.png`, await png(svg, s));
  fs.writeFileSync(`public/iconos/nexus-maskable-${s}.png`, await png(conMargen, s, '#22d3ee'));
}

const kb = (p) => (fs.statSync(p).size / 1024).toFixed(1).padStart(6) + ' KB';
console.log(`desde ${FUENTE}:`);
for (const f of ['app/favicon.ico', 'app/apple-icon.png',
  'public/iconos/nexus-192.png', 'public/iconos/nexus-512.png',
  'public/iconos/nexus-maskable-192.png', 'public/iconos/nexus-maskable-512.png']) {
  console.log(`  ${f.padEnd(38)} ${kb(f)}`);
}
console.log('\nLa tarjeta para compartir se genera aparte: tools/marca/generar-og.mjs');
