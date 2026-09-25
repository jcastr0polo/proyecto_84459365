/**
 * El logotipo vive en dos sitios por necesidad: app/icon.svg (del que salen
 * favicon, iconos de móvil y tarjeta al compartir) y el JSX de
 * components/ui/NexusMark.tsx (el que se pinta dentro de la aplicación).
 *
 * Este guardián comprueba que dibujan lo MISMO. Sin él, alguien retoca la
 * marca en un sitio, la pestaña y la cabecera dejan de coincidir, y nadie se
 * entera hasta que lo ve un tercero.
 *
 *   node tools/marca/comprobar-marca.mjs
 */
import fs from 'node:fs';

const svg = fs.readFileSync('app/icon.svg', 'utf8');
const jsx = fs.readFileSync('components/ui/NexusMark.tsx', 'utf8');

/** Normaliza para comparar: quita espacios y comillas, ignora may/min. */
const limpiar = (t) => t.replace(/["'\s]/g, '').toLowerCase();

/* El límite de palabra importa: sin él, `d=` casa también dentro de `id=`
   y el degradado del fondo entraba como si fuera un trazo de la N. */
const trazos = (t) => [...t.matchAll(/(?:^|\s)d=["']([^"']+)["']/g)].map((m) => limpiar(m[1]));
const circulos = (t) => [...t.matchAll(/<circle[^>]*cx=["']([\d.]+)["'][^>]*cy=["']([\d.]+)["'][^>]*r=["']([\d.]+)["']/g)]
  .map((m) => `${m[1]},${m[2]},${m[3]}`);
const grosor = (t) => (t.match(/stroke-?[Ww]idth=["{]?["']?([\d.]+)/) || [])[1];

const comparaciones = [
  ['trazos de la N', JSON.stringify(trazos(svg)), JSON.stringify(trazos(jsx))],
  ['nodos', JSON.stringify(circulos(svg)), JSON.stringify(circulos(jsx))],
  ['grosor del trazo', grosor(svg), grosor(jsx)],
];

let fallos = 0;
for (const [que, a, b] of comparaciones) {
  const ok = a === b && a !== undefined && a !== '[]';
  if (!ok) fallos++;
  console.log(`${ok ? '✓' : '✗'} ${que.padEnd(18)} icon.svg=${a}\n${' '.repeat(21)}NexusMark=${b}`);
}
console.log(fallos
  ? `\n${fallos} diferencia(s): la pestaña y la aplicación no enseñan lo mismo.`
  : '\nLa marca del favicon y la de la aplicación coinciden.');
process.exit(fallos ? 1 : 0);
