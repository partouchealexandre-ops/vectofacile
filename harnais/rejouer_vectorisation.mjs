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

/**
 * Meme principe que le harnais de bout en bout : on dit ce qui manque et
 * comment l'obtenir, on ne deroule pas une pile d'appels a la figure de celui
 * qui a simplement oublie d'installer les dependances.
 */
let vtracer;
try {
  vtracer = require('@visioncortex/vtracer');
} catch {
  console.log('');
  console.log('  HARNAIS DE LA CHAINE DE VECTORISATION : SAUTE, pas reussi.');
  console.log('  Le vectoriseur n\'est pas installe dans ce dossier.');
  console.log('  Pour l\'avoir : npm ci');
  console.log('');
  process.exit(0);
}

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

function rasteriser(fichier, largeur, hauteur, largeurPt) {
  const sortie = fichier + '.ppm';
  // LA RESOLUTION SE CALCULE, ELLE NE SE SUPPOSE PLUS, 26/08/2026.
  //
  // Elle valait 72 dpi, ce qui marchait par coincidence : le fichier livre
  // faisait alors UN POINT PAR PIXEL, donc 72 dpi redonnait exactement la
  // taille de depart. Depuis que la taille declaree vaut cent millimetres sur
  // la plus grande dimension, cette coincidence n'existe plus, et rasteriser a
  // 72 dpi comparerait une image de 284 pixels a une image de 1 270.
  //
  // On lit donc la taille que le FICHIER porte, et on en deduit la resolution
  // qui redonne la taille du cas. Le harnais suit le fichier au lieu de lui
  // dicter une convention.
  const resolution = (72 * ZOOM * largeur) / (largeurPt || largeur);
  const communs = [
    '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET',
    '-sDEVICE=ppmraw', `-r${resolution}`, `-g${largeur * ZOOM}x${hauteur * ZOOM}`,
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

console.log('  HARNAIS DE LA CHAINE DE VECTORISATION');
if (!avecGs) {
  console.log('  Ghostscript absent : les controles de rendu sont SAUTES, pas reussis.');
}
console.log('  ' + '-'.repeat(72));
console.log('  cas                     formes  couleurs  segments   recouvrement  eps=pdf');

let echecs = 0;
// LE TEMOIN DE LA FRANGE, 26/08/2026.
//
// Un bloc gris fonce sur fond blanc, avec un bord adouci comme le fait tout
// antialiasing, et un bloc cyan a l'autre bout de l'image. En Lab, les gris de
// ce bord sont PLUS PRES DU CYAN que du gris fonce :
//   #E8EAEC  cyan 43,7   gris 57,6
//   #C3C7CA  cyan 37,4   gris 45,0
// Tant que chaque pixel etait rabattu sur la palette entiere sans regarder ses
// voisins, chaque lettre ressortait bordee d'une couleur absente autour d'elle.
// Sur le logo de la Fondation de Nice, 18 208 pixels d'encre, soit neuf pour
// cent, partaient en cyan. Alex l'a vu en zoomant dans le PDF livre.
//
// Le temoin a ete verifie DANS LES DEUX SENS avant d'etre pose : 412 pixels de
// frange avec l'ancienne regle, zero avec la nouvelle.
{
  const L = 200, H = 200;
  const d = new Uint8ClampedArray(L * H * 4).fill(255);
  const poser = (x, y, rvb) => {
    const p = (y * L + x) * 4;
    d[p] = rvb[0]; d[p + 1] = rvb[1]; d[p + 2] = rvb[2]; d[p + 3] = 255;
  };
  const GRIS = [0x48, 0x55, 0x5D];
  const CYAN = [0x2F, 0xB4, 0xDF];
  const melange = (t) => GRIS.map((v) => Math.round(255 + (v - 255) * t));
  for (let y = 30; y < 130; y++) for (let x = 30; x < 130; x++) poser(x, y, GRIS);
  for (let y = 28; y < 132; y++) for (let x = 28; x < 132; x++) {
    const bord = Math.min(x - 28, y - 28, 131 - x, 131 - y);
    if (bord === 0) poser(x, y, melange(0.33));
    else if (bord === 1) poser(x, y, melange(0.66));
  }
  for (let y = 150; y < 190; y++) for (let x = 30; x < 170; x++) poser(x, y, CYAN);

  const image = { largeur: L, hauteur: H, donnees: d, reduction: 1,
                  largeurOrigine: L, hauteurOrigine: H };
  const px = preparerVectorisation(image, mesurer(image)).pixels;
  const estCyan = (x, y) => {
    const p = (y * L + x) * 4;
    return Math.abs(px[p] - CYAN[0]) < 8 && Math.abs(px[p + 1] - CYAN[1]) < 8
      && Math.abs(px[p + 2] - CYAN[2]) < 8;
  };
  let franges = 0;
  for (let y = 26; y < 134; y++) for (let x = 26; x < 134; x++) if (estCyan(x, y)) franges++;
  console.log('');
  console.log('  LA FRANGE, un bord ne prend que la couleur de ce qu\'il borde');
  console.log('  ' + '-'.repeat(72));
  console.log(`  ${franges === 0 ? 'ok   ' : 'ECHEC'} aucun pixel cyan autour du bloc gris`
    + `${franges ? ` (${franges} trouves)` : ''}`);
  console.log('  ' + '-'.repeat(72));
  if (franges !== 0) echecs++;
}

console.log('');
const details = [];

for (const cas of verite.cas) {
  const donnees = new Uint8ClampedArray(fs.readFileSync(path.join(IMAGES, cas.fichier)));
  const image = { largeur: cas.largeur, hauteur: cas.hauteur, donnees };
  const mesures = mesurer(image);
  const prepare = preparerVectorisation(image, mesures);
  const refusAttendu = cas.vectorisation === 'refusee';

  if (Boolean(prepare.refus) !== refusAttendu) {
    console.log(
      `  ECHEC ${cas.nom.padEnd(20)} vectorisation ${prepare.refus ? 'refusee' : 'acceptee'}, `
      + `${refusAttendu ? 'refus' : 'acceptation'} attendu`
    );
    echecs++;
    continue;
  }
  if (prepare.refus) {
    console.log(`  ok    ${cas.nom.padEnd(20)} refusee a raison : ${prepare.refus.motif}`);
    continue;
  }

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

  // LA POUSSIERE PART, LE FILET RESTE. Mesure du 26/08/2026 sur huit logos
  // clients : notre sortie sur un logo de fondation comptait 3 652 formes dont
  // 84 pour cent tenaient dans 2 x 2 pixels, pour 0,08 pour cent de la surface
  // d'encre. Le filtre les retire, et il ne juge une forme que si elle est
  // petite DANS LES DEUX DIRECTIONS : un filet de 1 px sur 220 garde une boite
  // longue, il survit. C'est ce que le cas trait_01px verifie ici meme.
  //
  // Le compte est un CONTRAT, pas une trace : un nettoyage muet est un mensonge
  // par omission, et c'est deja la doctrine de nettoyerSalissures.
  if (!programme.poussiere) {
    problemes.push('le programme ne dit pas ce qu\'il a retire comme poussiere');
  }
  if (/^trait_0[12]px$/.test(cas.nom)) {
    const large = programme.formes.some((f) => {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const sc of f.sousChemins) for (const sg of sc.segments) {
        for (const x of [sg.x, sg.x1, sg.x2]) if (Number.isFinite(x)) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
        }
        for (const y of [sg.y, sg.y1, sg.y2]) if (Number.isFinite(y)) {
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
      return Math.max(x1 - x0, y1 - y0) > 20 && Math.min(x1 - x0, y1 - y0) <= 3;
    });
    if (!large) {
      problemes.push('le trait fin a disparu du fichier livre : le filtre de poussiere '
        + 'ne doit JAMAIS retirer une forme longue dans une direction');
    }
  }

  // LES PHRASES VUES PAR LE VISITEUR PORTENT LEURS ACCENTS, 26/08/2026.
  //
  // L'avertissement sur le trait limite avait ete ecrit dans le style des
  // COMMENTAIRES du projet, qui sont sans accent par convention. Il est reste
  // des semaines en production a dire « sera decevant », « le trace ne peut pas
  // restituer le detail », « aucun reglage ». Le seul endroit du site ou l'on
  // annonce une mauvaise nouvelle etait aussi le seul ecrit en telegramme.
  //
  // Le controle ne juge pas l'orthographe : il cherche une liste courte de mots
  // qui, dans un texte francais, ne peuvent PAS s'ecrire sans accent.
  const SANS_ACCENT = /\b(decevant|trace ne|detail|quand meme|lui meme|reglage|A cette taille)\b/;
  for (const a of prepare.avertissements ?? []) {
    const entier = `${a.titre} ${a.texte} ${a.remede ?? ''}`;
    const faute = entier.match(SANS_ACCENT);
    if (faute) problemes.push(`un avertissement montre au visiteur perd ses accents : « ${faute[0]} »`);
  }

  // CONTROLE DE LA TAILLE DECLAREE, ajoute le 26/08/2026 apres un defaut vu en
  // production par Alex : un logo de 1 270 px ressortait en page de 448 mm,
  // parce que personne ne passait de largeur et que le cadre retombait sur un
  // point par pixel. La taille du fichier livre n'etait donc pas une decision,
  // c'etait le nombre de pixels du fichier depose.
  //
  // On lit la BoundingBox de l'EPS, en points, et on verifie qu'elle vaut cent
  // millimetres sur la PLUS GRANDE DIMENSION. Le controle porte sur le fichier
  // ecrit, pas sur la fonction qui l'ecrit : un script n'est jamais son propre
  // juge.
  const enteteEps = fs.readFileSync(base + '.eps', 'utf-8').slice(0, 400);
  const bb = enteteEps.match(/%%BoundingBox: 0 0 (\d+) (\d+)/);
  if (!bb) {
    problemes.push('l\'EPS livre ne porte pas de BoundingBox lisible');
  } else {
    const mm = (pt) => (Number(pt) * 25.4) / 72;
    const grand = Math.max(mm(bb[1]), mm(bb[2]));
    // Un point d'arrondi de chaque cote : la BoundingBox est entiere en points,
    // et un point vaut 0,353 mm.
    if (Math.abs(grand - 100) > 0.5) {
      problemes.push(
        `le fichier livre declare ${mm(bb[1]).toFixed(1)} x ${mm(bb[2]).toFixed(1)} mm, `
        + `soit ${grand.toFixed(1)} mm sur sa plus grande dimension au lieu de 100`
      );
    }
  }

  // ET LA LARGEUR DEMANDEE COMMANDE, quand elle est donnee. C'est l'autre
  // moitie du defaut : la valeur saisie par le visiteur servait au diagnostic
  // et n'atteignait jamais le fichier.
  const surMesure = versEps(programme, { titre: cas.nom, date: DATE_FIGEE, largeurMm: 60 });
  const bb60 = surMesure.match(/%%BoundingBox: 0 0 (\d+) (\d+)/);
  if (!bb60 || Math.abs((Number(bb60[1]) * 25.4) / 72 - 60) > 0.5) {
    problemes.push(`une largeur demandee de 60 mm ne se retrouve pas dans le fichier livre, `
      + `BoundingBox ${bb60 ? bb60[1] : 'illisible'} pt`);
  }

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
      const largeurPt = bb ? Number(bb[1]) : null;
      rEps = rasteriser(base + '.eps', cas.largeur, cas.hauteur, largeurPt);
      rPdf = rasteriser(base + '.pdf', cas.largeur, cas.hauteur, largeurPt);
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
