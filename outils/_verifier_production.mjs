import fs from 'node:fs'; import { chromium } from 'playwright';
const BASE = process.argv[2] || 'https://vectofacile.netlify.app';
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage();
const reseau = [];
page.on('response', async r => {
  const u = new URL(r.url());
  reseau.push({ chemin: u.pathname, statut: r.status(), type: r.headers()['content-type'] || '',
                encodage: r.headers()['content-encoding'] || '', taille: r.headers()['content-length'] || '' });
});
const journal = []; page.on('console', m => { if (m.type()==='error') journal.push(m.text()); });
page.on('pageerror', e => journal.push('pageerror : ' + e.message));

const rep = await page.goto(BASE, { waitUntil: 'networkidle' });
console.log('\n=== ENTETES DE LA PAGE ===');
const h = rep.headers();
for (const cle of ['content-security-policy','x-robots-tag','x-content-type-options','referrer-policy','permissions-policy','cross-origin-resource-policy','strict-transport-security','server','cache-control']) {
  console.log('  ' + cle.padEnd(30), h[cle] ? h[cle].slice(0, 150) : 'ABSENT');
}
console.log('\n=== ROBOTS ===');
const rob = await page.goto(BASE + '/robots.txt');
console.log('  statut', rob.status(), '| x-robots-tag :', rob.headers()['x-robots-tag'] || 'ABSENT');
console.log((await rob.text()).split('\n').filter(l=>l && !l.startsWith('#')).map(l=>'  '+l).join('\n'));

console.log('\n=== LE WEBASSEMBLY ===');
const w = await page.goto(BASE + '/vtracer_wasm_bg.wasm');
console.log('  statut         ', w.status());
console.log('  content-type   ', w.headers()['content-type'] || 'ABSENT');
console.log('  content-encoding', w.headers()['content-encoding'] || 'aucun');
console.log('  cache-control  ', w.headers()['cache-control'] || 'ABSENT');
const octets = await w.body();
console.log('  taille recue   ', octets.length, 'octets');
console.log('  entete magique ', [...octets.slice(0,4)].map(o=>o.toString(16).padStart(2,'0')).join(' '), '(00 61 73 6d attendu)');
const local = fs.readFileSync('public/vtracer_wasm_bg.wasm');
console.log('  identique au local ?', Buffer.compare(octets, local) === 0 ? 'OUI' : 'NON');

console.log('\n=== LES POLICES ===');
for (const p of ['/polices/poppins-700.woff2', '/polices/poppins-400.woff2']) {
  const r = await page.goto(BASE + p);
  console.log('  ' + p.padEnd(30), r.status(), r.headers()['content-type'] || '');
}
await nav.close();
