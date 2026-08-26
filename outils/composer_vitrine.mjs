#!/usr/bin/env node
/**
 * COMPOSE LES IMAGES DE LA VITRINE, avec le moteur du site.
 *
 * Il ne dessine rien lui-meme : il sert le dossier public, ouvre Chromium,
 * et laisse `src/simulation/rendu_simulation.js` poser le logo exactement
 * comme il le fait pour un visiteur de /voir-mon-logo. C'est la seule facon
 * d'avoir des images qui ne puissent pas diverger du produit.
 *
 * IL TOURNE EN LOCAL, JAMAIS SUR NETLIFY. La construction distante n'a pas de
 * navigateur et n'en aura pas : PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD vaut 1 dans
 * netlify.toml, pour de bonnes raisons. Les images produites sont donc
 * VERSIONNEES, comme les trente-huit photos derivees du lot.
 *
 *   npm run vitrine:composer
 *
 * A relancer quand le lot change, quand le logo change, ou quand une taille
 * de contenu/vitrine.mjs est rearbitree.
 */

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { VITRINE } from '../contenu/vitrine.mjs';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(RACINE, 'public');
const CIBLE = path.join(PUBLIC, 'vitrine');
const PORT = 8791;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.css': 'text/css; charset=utf-8',
};

// LE LOGO SE FABRIQUE DANS LA PAGE, avec la vraie police et le vrai symbole.
// Le rasteriser ici en Node demanderait un second moteur de rendu, donc une
// seconde verite sur ce a quoi ressemble notre marque.
const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<style>@font-face{font-family:'Poppins';src:url('/polices/poppins-700.woff2') format('woff2');font-weight:700}</style>
</head><body><script type="module">
import { dessiner } from '/src/simulation/rendu_simulation.js';
const charger = (src) => new Promise((ok, ko) => {
  const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(src)); i.src = src;
});
async function fabriquerLogo(encre) {
  await document.fonts.load('700 100px Poppins');
  await document.fonts.ready;
  const blanc = encre === 'blanc';
  const symbole = await charger(blanc ? '/vitrine_symbole_negatif.svg' : '/vitrine_symbole.svg');
  const H = 300, S = 300, GOUTTIERE = 34, CORPS = 128, INTERLIGNE = 134;
  const regle = document.createElement('canvas').getContext('2d');
  regle.font = '700 ' + CORPS + 'px Poppins';
  const mot = Math.max(regle.measureText('Bon à').width, regle.measureText('Marquer').width);
  const t = document.createElement('canvas');
  t.width = Math.ceil(S + GOUTTIERE + mot); t.height = H;
  const x = t.getContext('2d');
  x.drawImage(symbole, 0, 0, S, S);
  x.fillStyle = blanc ? '#FFFFFF' : '#0A2D4D';
  x.font = '700 ' + CORPS + 'px Poppins';
  x.fillText('Bon à', S + GOUTTIERE, CORPS);
  x.fillText('Marquer', S + GOUTTIERE, CORPS + INTERLIGNE);
  return t;
}
window.composer = async (vitrine) => {
  const lot = await (await fetch('/src/simulation/lot1.json')).json();
  const logos = { navy: await fabriquerLogo('navy'), blanc: await fabriquerLogo('blanc') };
  const sorties = [];
  for (const v of vitrine) {
    const vue = lot.vues.find((w) => w.image === v.image);
    if (!vue) throw new Error('vue absente du lot : ' + v.image);
    const photo = await charger('/simulation/' + vue.image);
    const toile = document.createElement('canvas');
    // cadre: false. Le cadre pointille appartient a l'outil, ou il dit « voici
    // la zone ». Sur une vitrine il ne dirait rien et salirait l'image.
    const r = dessiner({ toile, vue, photo, logo: logos[v.encre], part: v.part, cadre: false });
    // LA TAILLE REELLE DE LA PHOTO ENTIERE, en millimetres. C'est elle qui
    // decide de la taille relative des objets sur l'accueil : sans elle, un
    // carnet A5 paraitrait aussi grand qu'un t-shirt.
    sorties.push({
      image: v.image, donnees: toile.toDataURL('image/jpeg', 0.92).split(',')[1],
      largeurPx: toile.width, hauteurPx: toile.height,
      largeurMmPhoto: Math.round(toile.width * r.mmParPixel),
      hauteurMmPhoto: Math.round(toile.height * r.mmParPixel),
      largeurMm: Math.round(r.pose.largeurMm), hauteurMm: Math.round(r.pose.hauteurMm),
      objet: vue.objet, zone: vue.zone,
    });
  }
  return sorties;
};
</script></body></html>`;

// Le symbole est copie dans public le temps de la composition : identite/ n'est
// pas servi, et il n'a rien a y faire.
const temporaires = [
  ['identite/symbole.svg', 'vitrine_symbole.svg'],
  ['identite/symbole_negatif.svg', 'vitrine_symbole_negatif.svg'],
];
for (const [source, cible] of temporaires) {
  fs.copyFileSync(path.join(RACINE, source), path.join(PUBLIC, cible));
}

const serveur = http.createServer((requete, reponse) => {
  const url = requete.url.split('?')[0];
  if (url === '/') {
    reponse.writeHead(200, { 'Content-Type': TYPES['.html'] });
    return reponse.end(PAGE);
  }
  const fichier = path.join(PUBLIC, url);
  if (!fichier.startsWith(PUBLIC) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) {
    reponse.writeHead(404); return reponse.end();
  }
  reponse.writeHead(200, { 'Content-Type': TYPES[path.extname(fichier)] || 'application/octet-stream' });
  reponse.end(fs.readFileSync(fichier));
});
await new Promise((ok) => serveur.listen(PORT, ok));

let navigateur;
try { navigateur = await chromium.launch(); } catch (e) {
  console.error('  Chromium manque. La vitrine se compose en local, jamais sur Netlify.');
  console.error('  Installer les navigateurs de Playwright, puis relancer.');
  serveur.close(); process.exit(1);
}
const page = await navigateur.newPage({ viewport: { width: 1200, height: 900 } });
page.on('pageerror', (e) => { console.error('  ERREUR dans la page :', e.message); });
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
const sorties = await page.evaluate((v) => window.composer(v), VITRINE);

fs.mkdirSync(CIBLE, { recursive: true });
let fautes = 0;
console.log('');
console.log('  VITRINE DE L\'ACCUEIL, composee par le moteur');
console.log('  ' + '-'.repeat(66));
for (const s of sorties) {
  fs.writeFileSync(path.join(CIBLE, s.image), Buffer.from(s.donnees, 'base64'));
  const attendu = VITRINE.find((v) => v.image === s.image);
  const octets = fs.statSync(path.join(CIBLE, s.image)).size;
  console.log(`  ${s.image}  ${s.largeurPx}x${s.hauteurPx} px  ${Math.round(octets / 1024)} ko`
    + `  objet ${s.largeurMmPhoto}x${s.hauteurMmPhoto} mm`
    + `  logo ${s.largeurMm} x ${s.hauteurMm} mm  ${s.objet}, ${s.zone.toLowerCase()}`);
  // LES DIMENSIONS DECLAREES DOIVENT ETRE LES VRAIES. Elles servent aux
  // attributs width et height de la page, qui reservent la place avant que
  // l'image arrive : fausses, elles feraient sauter la mise en page.
  if (attendu.largeurPx !== s.largeurPx || attendu.hauteurPx !== s.hauteurPx) {
    console.error(`  ECHEC ${s.image} : contenu/vitrine.mjs annonce `
      + `${attendu.largeurPx}x${attendu.hauteurPx}, l'image fait ${s.largeurPx}x${s.hauteurPx}`);
    fautes++;
  }
  // ET LES MILLIMETRES DECLARES SONT CEUX DU LOT. Ils commandent la taille
  // relative des objets sur l'accueil : recopies a la main et jamais
  // reverifies, ils vieilliraient a la premiere rederivation du lot, en
  // silence, et l'accueil mentirait sur des tailles.
  if (attendu.largeurMmPhoto !== s.largeurMmPhoto || attendu.hauteurMmPhoto !== s.hauteurMmPhoto) {
    console.error(`  ECHEC ${s.image} : contenu/vitrine.mjs annonce `
      + `${attendu.largeurMmPhoto}x${attendu.hauteurMmPhoto} mm, le lot donne `
      + `${s.largeurMmPhoto}x${s.hauteurMmPhoto} mm`);
    fautes++;
  }
}
console.log('  ' + '-'.repeat(66));
console.log(`  ${sorties.length} images ecrites dans public/vitrine/. A COMMITTER.`);
console.log('');

for (const [, cible] of temporaires) fs.rmSync(path.join(PUBLIC, cible), { force: true });
await navigateur.close();
serveur.close();
process.exit(fautes === 0 ? 0 : 1);
