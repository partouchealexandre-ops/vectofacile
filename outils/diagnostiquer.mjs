#!/usr/bin/env node
/**
 * Passe une image au moteur de mesure et rend le resultat en clair.
 *
 *   node outils/diagnostiquer.mjs mon_logo.png [largeur_impression_mm]
 *
 * Le decodage passe par un vrai navigateur, comme chez le visiteur, et non par
 * une bibliotheque de node : les deux ne rendent pas exactement les memes
 * pixels sur les bords adoucis, et c'est le rendu du navigateur qui fait foi
 * puisque c'est celui que le produit utilise.
 */
import fs from 'node:fs'; import { chromium } from 'playwright';
import { mesurer } from '../src/moteur/mesures.js';
const [fichier, mmStr] = process.argv.slice(2);
if (!fichier || !fs.existsSync(fichier)) {
  console.error("Usage : node outils/diagnostiquer.mjs <image.png|jpg|gif|webp> [largeur_mm]");
  process.exit(2);
}
if (/\.svg$/i.test(fichier)) {
  console.error(
    "Un SVG est deja vectoriel : il n'y a rien a mesurer dessus.\n"
    + "Rasterisez le d'abord : node outils/rendre_svg.mjs " + fichier + " sortie.png 1000"
  );
  process.exit(2);
}
let nav; try { nav = await chromium.launch(); } catch { nav = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'}); }
const page = await nav.newPage();
const b64 = fs.readFileSync(fichier).toString('base64');
const r = await page.evaluate(async (b64) => {
  const img = await createImageBitmap(await (await fetch('data:image/png;base64,'+b64)).blob());
  const c = new OffscreenCanvas(img.width, img.height); const x = c.getContext('2d'); x.drawImage(img,0,0);
  const d = x.getImageData(0,0,img.width,img.height); return {w:d.width,h:d.height,data:Array.from(d.data)};
}, b64);
await nav.close();
const mm = Number(mmStr) || null;
const m = mesurer({largeur:r.w,hauteur:r.h,donnees:new Uint8ClampedArray(r.data)}, mm ? {largeurImprimeeMm: mm} : {});
const pc = (px) => px === null ? null : +(100*px/r.w).toFixed(2);
console.log(JSON.stringify({
  taille: r.w+' x '+r.h,
  couleurs: m.m2Couleurs.couleursReelles+' reelles / '+m.m2Couleurs.couleursBrutes+' brutes',
  palette: m.m2Couleurs.palette.map(c=>c.hex+' '+(100*c.part).toFixed(1)+'%'),
  halo: m.m3Halo.pourcentBoite.toFixed(2)+' %',
  trait: {px: m.m5TraitLePlusFin.encadrementPx?.basse?.toFixed(1), pctDiametre: pc(m.m5TraitLePlusFin.encadrementPx?.basse), mm: m.m5TraitLePlusFin.encadrementMm?.basse?.toFixed(2)},
  ecart: {px: m.m6ContreFormes.ecartMinimalPx?.basse?.toFixed(1), pctDiametre: pc(m.m6ContreFormes.ecartMinimalPx?.basse), mm: m.m6ContreFormes.ecartMinimalMm?.basse?.toFixed(2)},
  contreFormes: m.m6ContreFormes.nombreContreFormes,
  degrade: m.m10IndicesExport.partInterieurVariable,
  transparence: m.m4Transparence.aTransparencePartielle,
  salissures: m.proprete.composantesRetirees, trous: m.proprete.trousBouches,
}, null, 2));
