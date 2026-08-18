#!/usr/bin/env node
/**
 * Harnais de la chaine de vectorisation : image -> VTracer -> SVG ->
 * programme de trace -> EPS et PDF.
 *
 * Ce harnais pose trois questions, dans cet ordre d'importance.
 *
 * 1. L'EPS et le PDF dessinent ils la MEME chose ? C'est le controle le plus
 *    dur et le plus utile : le client recoit deux fichiers, et une divergence
 *    entre eux ne se decouvrirait qu'a l'atelier, sur la presse. Les deux sont
 *    rasterises et compares pixel a pixel.
 *
 * 2. Le vectoriel ressemble t il a l'original ? Mesure par le recouvrement des
 *    zones encrees, l'intersection sur l'union. Un aplat qui glisse d'un pixel
 *    ne compte presque pas, un trait fin qui disparait compte enormement, ce
 *    qui est exactement la hierarchie voulue.
 *
 * 3. Le nombre de couleurs du fichier livre est il celui qu'on a ANNONCE au
 *    client ? La palette envoyee a VTracer est celle mesuree par M2. Si le
 *    diagnostic dit six couleurs, le fichier livre doit en porter six, sinon le
 *    diagnostic ment sur son propre livrable.
 *
 * Ghostscript n'est utilise QUE par ce harnais, pour rasteriser et comparer.
 * Le site, lui, n'en depend pas : tout se passe dans le navigateur.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { mesurer } from '../src/moteur/mesures.js';
import { construireProgramme, inventaire } from '../src/vectorisation/programme.js';
import { versEps } from '../src/vectorisation/eps.js';
import { versPdf } from '../src/vectorisation/pdf.js';
import { preparerVectorisation } from '../src/vectorisation/options.js';

const require = createRequire(import.meta.url);
const vtracer = require('@visioncortex/vtracer');

const ICI = path.dirname(fileURLToPath(import.meta.url));
const IMAGES = path.join(ICI, 'corpus_synthetique', 'images');
const SORTIES = path.join(ICI, 'sorties');

/** Recouvrement minimal exige entre le vectoriel et l'original. */
const RECOUVREMENT_MINIMAL = 0.90;
/** Ecart maximal tolere entre le rendu de l'EPS et celui du PDF. */
const ECART_MAXIMAL_ENTRE_FORMATS = 0.001;
/** Date figee : deux executions doivent produire des fichiers identiques. */
const DATE_FIGEE = '2026-08-18T00:00:00Z';

function gsDisponible() {
  try { execFileSync('gs', ['--version'], { stdio: 'pipe' }); return true; }
  catch { return false; }
}

/**
 * Facteur de sur echantillonnage du rendu.
 *
 * Pourquoi 4 et pas 1. Un trait de 1 px devient une forme vectorielle de 1 pt
 * de large. Rasterisee a 72 points par pouce sans antialiasing, elle tombe
 * entre deux centres de pixels et le rendu en perd la moitie : le harnais
 * annoncait 37 pour cent de recouvrement pour un fichier parfaitement juste.
 * A 4x, chaque pixel d'origine couvre 16 pixels de rendu et la comparaison
 * cesse de mesurer l'echantillonnage du rasteriseur.
 */
const ZOOM = 4;

function rasteriser(fichier, largeur, hauteur) {
  const sortie = fichier + '.ppm';
  const communs = [
    '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET',
    '-sDEVICE=ppmraw', `-r${72 * ZOOM}`, `-g${largeur * ZOOM}x${hauteur * ZOOM}`,
    '-dGraphicsAlphaBits=1', '-dTextAlphaBits=1',
    `-sOutputFile=${sortie}`,
  ];
  const propres = fichier.endsWith('.eps') ? ['-dEPSCrop'] : ['-dUseCropBox'];
  execFileSync('gs', [...communs, ...propres, fichier], { stdio: 'pipe' });
  return lirePpm(sortie);
}

function lirePpm(fichier) {
  const donnees = fs.readFileSync(fichier);
  let position = 0;
  const jeton = () => {
    while (donnees[position] === 32 || donnees[position] === 10 || donnees[position] === 13 || donnees[position] === 9) position++;
    if (donnees[position] === 35) { while (donnees[position] !== 10) position++; return jeton(); }
    let debut = position;
    while (position < donnees.length && donnees[position] > 32) position++;
    return donnees.slice(debut, position).toString('ascii');
  };
  const magie = jeton();
  if (magie !== 'P6') throw new Error(`PPM inattendu : ${magie}`);
  const largeur = Number(jeton());
  const hauteur = Number(jeton());
  jeton();
  position++;
  return { largeur, hauteur, pixels: donnees.slice(position) };
}

/** Masque encre grossier : tout ce qui n'est pas presque blanc. */
function masqueDepuisRvb(pixels, n) {
  const masque = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const p = i * 3;
    masque[i] = (pixels[p] > 245 && pixels[p + 1] > 245 && pixels[p + 2] > 245) ? 0 : 1;
  }
  return masque;
}

function masqueDepuisRvba(donnees, largeur, hauteur, zoom) {
  const masque = new Uint8Array(largeur * zoom * hauteur * zoom);
  for (let y = 0; y < hauteur * zoom; y++) {
    for (let x = 0; x < largeur * zoom; x++) {
      const source = ((y / zoom) | 0) * largeur + ((x / zoom) | 0);
      const p = source * 4;
      const a = donnees[p + 3];
      masque[y * largeur * zoom + x] =
        (a < 128 || (donnees[p] > 245 && donnees[p + 1] > 245 && donnees[p + 2] > 245)) ? 0 : 1;
    }
  }
  return masque;
}

function recouvrement(a, b) {
  let intersection = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) union++;
    if (a[i] && b[i]) intersection++;
  }
  return union === 0 ? 1 : intersection / union;
}

function ecartPixels(a, b) {
  let differents = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 3) {
    if (Math.abs(a[i] - b[i]) > 12 || Math.abs(a[i + 1] - b[i + 1]) > 12 || Math.abs(a[i + 2] - b[i + 2]) > 12) differents++;
  }
  return differents / (n / 3);
}

const verite = JSON.parse(fs.readFileSync(path.join(IMAGES, 'verite_terrain.json'), 'utf-8'));
fs.mkdirSync(SORTIES, { recursive: true });
const avecGs = gsDisponible();

console.log('');
console.log('  HARNAIS DE LA CHAINE DE VECTORISATION');
if (!avecGs) {
  console.log('  Ghostscript absent : les controles de rendu sont SAUTES, pas reussis.');
}
console.log('  ' + '-'.repeat(72));
console.log('  cas                     formes  couleurs  segments   recouvrement  eps=pdf');

let echecs = 0;
const details = [];

for (const cas of verite.cas) {
  const donnees = new Uint8ClampedArray(fs.readFileSync(path.join(IMAGES, cas.fichier)));
  const image = { largeur: cas.largeur, hauteur: cas.hauteur, donnees };
  const mesures = mesurer(image);
  const prepare = preparerVectorisation(image, mesures);

  let svg;
  try {
    svg = vtracer.convertPixels(Buffer.from(prepare.pixels.buffer), cas.largeur, cas.hauteur, prepare.options);
  } catch (e) {
    console.log(`  ECHEC ${cas.nom} : vectorisation impossible, ${e.message}`);
    echecs++;
    continue;
  }

  let programme, inv;
  try {
    programme = construireProgramme(svg);
    inv = inventaire(programme);
  } catch (e) {
    console.log(`  ECHEC ${cas.nom} : lecture du SVG impossible, ${e.message}`);
    echecs++;
    continue;
  }

  const base = path.join(SORTIES, cas.nom);
  fs.writeFileSync(base + '.svg', svg);
  fs.writeFileSync(base + '.eps', versEps(programme, { titre: cas.nom, date: DATE_FIGEE }));
  fs.writeFileSync(base + '.pdf', versPdf(programme, { titre: cas.nom, date: DATE_FIGEE }));

  const problemes = [];

  // Controle 3 : le fichier livre porte la palette annoncee.
  // Il ne s'applique qu'aux dessins a aplats. Sur un degrade, le nombre de
  // couleurs annonce n'a pas de sens metier et sera traite par le verdict,
  // pas par le vectoriseur : le fichier compte alors le fond en plus.
  const aplat = (mesures.m10IndicesExport.partInterieurVariable ?? 0) < 0.1;
  const couleursAttendues = mesures.m2Couleurs.couleursReelles
    + (mesures.fond.type === 'couleur' ? 1 : 0);
  if (aplat && inv.couleurs !== couleursAttendues) {
    problemes.push(
      `le diagnostic annonce ${mesures.m2Couleurs.couleursReelles} couleurs d'encre, `
      + `le fichier livre en porte ${inv.couleurs} au lieu de ${couleursAttendues} fond compris`
    );
  }

  let taux = null, ecart = null;
  if (avecGs) {
    let rEps, rPdf;
    try {
      rEps = rasteriser(base + '.eps', cas.largeur, cas.hauteur);
      rPdf = rasteriser(base + '.pdf', cas.largeur, cas.hauteur);
    } catch (e) {
      const message = (e.stdout ? e.stdout.toString() : e.message).split('\n').slice(0, 2).join(' ');
      problemes.push(`fichier illisible par le rasteriseur : ${message.trim()}`);
    }
  }
  if (avecGs && problemes.length === 0) {
    const rEps = rasteriser(base + '.eps', cas.largeur, cas.hauteur);
    const rPdf = rasteriser(base + '.pdf', cas.largeur, cas.hauteur);

    // Controle 1 : EPS et PDF doivent dessiner la meme chose.
    ecart = ecartPixels(rEps.pixels, rPdf.pixels);
    if (ecart > ECART_MAXIMAL_ENTRE_FORMATS) {
      problemes.push(`l'EPS et le PDF divergent sur ${(100 * ecart).toFixed(3)} pour cent des pixels`);
    }

    // Controle 2 : ressemblance a l'original.
    const n = cas.largeur * ZOOM * cas.hauteur * ZOOM;
    taux = recouvrement(
      masqueDepuisRvba(donnees, cas.largeur, cas.hauteur, ZOOM),
      masqueDepuisRvb(rPdf.pixels, n)
    );
    if (taux < RECOUVREMENT_MINIMAL) {
      problemes.push(`recouvrement de ${(100 * taux).toFixed(1)} pour cent avec l'original, sous le plancher de ${100 * RECOUVREMENT_MINIMAL}`);
    }
  }

  const marque = problemes.length ? 'ECHEC' : 'ok   ';
  console.log(
    `  ${marque} ${cas.nom.padEnd(20)} ${String(inv.formes).padStart(4)}  ${String(inv.couleurs).padStart(6)}`
    + `  ${String(inv.segments).padStart(8)}  ${taux === null ? '     n/a' : (100 * taux).toFixed(1).padStart(11) + ' %'}`
    + `  ${ecart === null ? 'n/a' : (ecart <= ECART_MAXIMAL_ENTRE_FORMATS ? 'oui' : 'NON')}`
  );
  if (problemes.length) { echecs++; details.push({ cas: cas.nom, problemes }); }
}

console.log('  ' + '-'.repeat(72));
if (details.length) {
  console.log('');
  for (const d of details) {
    console.log(`  ${d.cas}`);
    for (const p of d.problemes) console.log(`    ${p}`);
  }
}
console.log('');
console.log(`  ${verite.cas.length} cas, ${echecs} echec(s). Sorties dans harnais/sorties/.`);
console.log('');
process.exit(echecs === 0 ? 0 : 1);
