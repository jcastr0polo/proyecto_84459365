import { chromium } from 'playwright';
import { readFileSync } from 'fs';
const cfg = Object.fromEntries(readFileSync('.credenciales','utf8').split('\n')
  .filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const i=l.indexOf('=');return [l.slice(0,i), l.slice(i+1).trim()];}));

const NUEVA = 'Temporal2026!';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 430, height: 950 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => m.type()==='error' && errs.push(m.text()));

await p.goto(`${cfg.URL}/login`, { waitUntil: 'networkidle' });
await p.locator('input[type="email"]').first().fill(cfg.STUDENT_EMAIL);
await p.locator('input[type="password"]').first().fill(cfg.STUDENT_PASSWORD);
await p.locator('button[type="submit"]').first().click();
await p.waitForURL(/change-password/, { timeout: 20000 }).catch(()=>{});
await p.waitForTimeout(1500);

const campos = await p.locator('input[type="password"]').count();
console.log('campos de contraseña en el formulario:', campos);
const inputs = p.locator('input[type="password"]');
if (campos === 3) {
  await inputs.nth(0).fill(cfg.STUDENT_PASSWORD);
  await inputs.nth(1).fill(NUEVA);
  await inputs.nth(2).fill(NUEVA);
} else {
  await inputs.nth(0).fill(NUEVA);
  await inputs.nth(1).fill(NUEVA);
}
await p.locator('button[type="submit"]').first().click();
await p.waitForTimeout(4000);
console.log('tras cambiar:', p.url().replace(cfg.URL, ''));

if (!p.url().includes('/student') || p.url().includes('change-password')) {
  await p.goto(`${cfg.URL}/student`, { waitUntil: 'networkidle' });
}
await p.waitForTimeout(3500);
await p.screenshot({ path: '.screenshots/real-estudiante.png', fullPage: true });

const m = await p.evaluate(() => ({
  h1: document.querySelector('h1')?.textContent?.trim(),
  secciones: [...document.querySelectorAll('h2')].map(e => e.textContent.trim()),
  necesita: [...document.querySelectorAll('p')].filter(e => /Necesitas|necesitarías/.test(e.textContent)).map(e => e.textContent.trim()),
  barra: !!document.querySelector('nav[aria-label="Accesos rápidos"]'),
}));
console.log('título:', m.h1);
console.log('secciones:', m.secciones.join(' | '));
console.log('bloque "qué necesitas":', m.necesita.length ? m.necesita.join(' // ') : 'no aparece');
console.log('barra de pulgar:', m.barra);
console.log(errs.length ? 'ERRORES: ' + [...new Set(errs)].join(' | ') : 'sin errores de consola');
await b.close();
