#!/usr/bin/env node
/**
 * Rejoue le site COMPLET, dans un navigateur, sur de vrais fichiers.
 *
 *   node outils/rejouer_fichier_reel.mjs mon_logo.jpg autre.png
 *
 * Sert quand un visiteur rapporte un probleme : on lui demande son fichier, on
 * le passe ici, et on voit l'etape qui casse au lieu de la deviner. Le serveur
 * local sert les MEMES entetes qu'en production, politique de securite
 * comprise, sinon on ne reproduit pas le bon site.
 *
 * A garder distinct du harnais : le harnais teste des images dont on connait la
 * reponse, celui ci regarde ce qui arrive sur des fichiers dont on ne sait rien.
 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http';
import { chromium } from 'playwright';
import { entetesGlobales } from './entetes.mjs';
const PUBLIC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
const TYPES = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.wasm':'application/wasm','.woff2':'font/woff2','.txt':'text/plain'};
const serveur = http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split('?')[0]);const f=path.join(PUBLIC,u==='/'?'index.html':u);
  if(!f.startsWith(PUBLIC)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){r.writeHead(404);r.end('absent');return;}
  r.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream',...entetesGlobales()});r.end(fs.readFileSync(f));});
await new Promise(r=>serveur.listen(8321,r));
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage();
const journal=[]; page.on('console',m=>journal.push(m.type()+' : '+m.text())); page.on('pageerror',e=>journal.push('pageerror : '+e.message));
await page.goto('http://127.0.0.1:8321/');
const cas = process.argv.slice(2);
for (const chemin of cas) {
  const b64 = fs.readFileSync(chemin).toString('base64');
  const nom = path.basename(chemin);
  const r = await page.evaluate(async ({b64, nom}) => {
    // Pas de fetch('data:...') : la politique de securite du site l'interdit,
    // connect-src 'self' ne couvre pas le schema data. On decode a la main.
    const brut = atob(b64);
    const octets = new Uint8Array(brut.length);
    for (let i = 0; i < brut.length; i++) octets[i] = brut.charCodeAt(i);
    const type = nom.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const f = new File([octets], nom, {type});
    const t0 = performance.now();
    try { await globalThis.vecto.traiter(f); } catch (e) { return {erreur: String(e)}; }
    const etat = globalThis.vecto.etat();
    const err = document.getElementById('erreur');
    return {
      ms: Math.round(performance.now()-t0),
      erreurAffichee: err && !err.hidden ? err.textContent.trim() : null,
      dims: etat.mesures ? etat.mesures.m1Dimensions.largeurPx + 'x' + etat.mesures.m1Dimensions.hauteurPx : null,
      couleurs: etat.mesures ? etat.mesures.m2Couleurs.couleursReelles + '/' + etat.mesures.m2Couleurs.couleursBrutes : null,
      horsPalette: etat.mesures ? +(etat.mesures.m2Couleurs.pixelsHorsPalette / Math.max(1, etat.mesures.m2Couleurs.pixelsEncre)).toFixed(3) : null,
      variation: etat.mesures && etat.mesures.m10IndicesExport.partInterieurVariable !== null ? +etat.mesures.m10IndicesExport.partInterieurVariable.toFixed(3) : null,
      programme: etat.programme ? etat.programme.formes.length + ' formes' : null,
    };
  }, {b64, nom});
  console.log(nom.padEnd(30), JSON.stringify(r));
}
if (journal.length) { console.log('--- journal ---'); journal.slice(0,12).forEach(l=>console.log('  '+l)); }
await nav.close(); serveur.close();
