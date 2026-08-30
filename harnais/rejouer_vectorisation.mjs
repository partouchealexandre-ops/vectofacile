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
import {
  preparerVectorisation, reglagesDuTrait, SURFACE_MAX_AJUSTEMENT_PX,
  pixelsPourVectorisation, facteurSurEchantillon, SURFACE_SANS_SUR_ECHANTILLON_PX,
} from '../src/vectorisation/options.js';
import { lisserBoucle } from '../src/vectorisation/lissage.js';

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
const ZOOM = 5;

/**
 * ON JUGE AU CENTRE DU PIXEL, 26/08/2026.
 *
 * CE QUI N'ALLAIT PAS. Le recouvrement comparait le rendu du fichier livre,
 * agrandi ZOOM fois, a la source agrandie de la meme facon, pixel de rendu
 * contre pixel de rendu. Tant que nos contours tombaient n'importe ou dans la
 * grille, ca marchait. Depuis que le bord se pose EXACTEMENT sur le bord du
 * pixel d'origine, chaque arete du fichier tombe pile sur une frontiere de la
 * grille de rendu, et c'est le rasteriseur qui tranche : Ghostscript peint la
 * rangee limite, la reference ne la compte pas. Un trait de 1 px parfaitement
 * juste tombait a 91 pour cent, et le meme controle a ZOOM 8 le remontait a
 * 94 en faisant chuter le trait de 3 px de 99 a 94. Un chiffre qui bouge quand
 * on change la loupe ne mesure pas le fichier, il mesure la loupe.
 *
 * LA REGLE. Un pixel de l'image d'origine est de l'encre ou il ne l'est pas ;
 * la bonne question est donc « au CENTRE de ce pixel, le fichier livre pose t
 * il de l'encre ». Le centre est a un demi pixel de toute arete entiere : plus
 * aucune egalite a departager. Le zoom devient impair pour qu'un pixel de
 * rendu tombe exactement au centre.
 *
 * CE QUE CE CONTROLE NE VOIT PLUS, ET QUI A DONC SON PROPRE TEMOIN. Juger au
 * centre rend le recouvrement AVEUGLE a un engraissement de moins d'un demi
 * pixel : c'est precisement le defaut corrige le meme jour. Il est mesure a
 * part, par LE POIDS DU TRAIT, qui compare la surface d'encre livree a la
 * couverture reelle de la source. Un controle qui perd une sensibilite doit
 * dire ou elle est reprise.
 */

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
  //
  // ET ELLE NE SE DEVINE PAS NON PLUS. La premiere ecriture retombait sur
  // `largeurPt || largeur` quand l'appelant ne disait rien. Ce repli avait
  // l'air prudent ; il a cache un effondrement complet pendant cinq patchs.
  // Un appelant sur deux avait ete oublie, le repli rendait exactement
  // l'ancien comportement, et le harnais annoncait des recouvrements de zero
  // pour cent sur vingt et un cas sans qu'on sache pourquoi. Un defaut
  // silencieux vaut moins qu'une erreur bruyante : on refuse.
  if (!(largeurPt > 0)) {
    throw new Error(
      `rasteriser appele sans la taille declaree du fichier, pour ${path.basename(fichier)}. `
      + "Cette taille se lit dans la BoundingBox du fichier livre : sans elle, on comparerait "
      + "deux images d'echelles differentes et le recouvrement ne voudrait rien dire."
    );
  }
  const resolution = (72 * ZOOM * largeur) / largeurPt;
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

/** Le rendu, echantillonne au centre de chaque pixel de l'image d'origine. */
function masqueAuCentre(pixels, largeur, hauteur, zoom) {
  const masque = new Uint8Array(largeur * hauteur);
  const milieu = (zoom - 1) >> 1;
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const p = ((y * zoom + milieu) * largeur * zoom + (x * zoom + milieu)) * 3;
      masque[y * largeur + x] = (pixels[p] > 245 && pixels[p + 1] > 245 && pixels[p + 2] > 245) ? 0 : 1;
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
// LES DEUX TEMOINS DU TRAIT COURANT, 26/08/2026.
//
// La decision de vectorisation se prenait sur le MINIMUM des cretes. Sur huit
// logos clients reels, six declenchaient l'avertissement et trois recevaient le
// plus dur des deux, dont un logo dont la mediane de trait est a 11 pixels. Le
// minimum y valait 1 px et representait 0,26 pour cent des points : un lisere
// de compression decidait pour tout le fichier.
//
// Les deux temoins ci-dessous encadrent le nouveau comportement, et il faut LES
// DEUX : sans le second, on aurait simplement desactive l'avertissement.
{
  const dessiner = (peindre) => {
    const L = 600, H = 600;
    const d = new Uint8ClampedArray(L * H * 4).fill(255);
    const poser = (x, y) => {
      const p = (y * L + x) * 4;
      d[p] = 20; d[p + 1] = 20; d[p + 2] = 20; d[p + 3] = 255;
    };
    peindre(poser);
    return { largeur: L, hauteur: H, donnees: d, reduction: 1, largeurOrigine: L, hauteurOrigine: H };
  };
  const juger = (image) => {
    const m = mesurer(image);
    const prep = preparerVectorisation(image, m);
    return {
      min: m.m5TraitLePlusFin?.encadrementPx?.basse ?? null,
      courant: m.m5TraitLePlusFin?.courantPx ?? null,
      alerte: (prep.avertissements ?? [])[0]?.gravite ?? 'aucune',
      mode: prep.options?.mode ?? null,
      lissage: prep.options?.lissage ?? false,
      serre: prep.options?.lissageReglages?.tolerance ?? null,
    };
  };

  // UN DESSIN FRANC QUI PORTE UN ACCIDENT. Six barres de 40 px, et un lisere
  // de 1 px sur trente. C'est la situation du logo de la Fondation de Nice.
  const accident = juger(dessiner((poser) => {
    for (const x0 of [40, 130, 220, 310, 400, 490]) {
      for (let y = 40; y < 540; y++) for (let x = x0; x < x0 + 40; x++) poser(x, y);
    }
    for (let x = 60; x < 90; x++) poser(x, 570);
  }));
  // UN DESSIN REELLEMENT FILIFORME. Vingt traits de 1 px, et rien d'autre.
  const filiforme = juger(dessiner((poser) => {
    for (let k = 0; k < 20; k++) for (let y = 40; y < 540; y++) poser(40 + k * 28, y);
  }));

  console.log('');
  console.log('  LE TRAIT COURANT, et non plus le minimum');
  console.log('  ' + '-'.repeat(72));
  const dire = (ok, libelle, detail) => {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}${detail ? `  [${detail}]` : ''}`);
    if (!ok) echecs++;
  };
  // LE CHAMP DOIT EXISTER. La sortie de mesurer recopie champ par champ, et un
  // champ oublie disparait en silence : c'est arrive a la premiere ecriture,
  // la mesure existait et la decision ne la voyait jamais.
  dire(Number.isFinite(accident.courant) && Number.isFinite(filiforme.courant),
       'la mesure du trait courant arrive jusqu\'a la decision',
       `${accident.courant} et ${filiforme.courant}`);
  dire(accident.courant >= accident.min,
       'le trait courant n\'est jamais sous le minimum, par construction',
       `courant ${accident.courant}, min ${accident.min}`);
  dire(accident.min <= 1 && accident.alerte === 'aucune',
       'un dessin franc portant un accident de 1 px n\'est plus condamne',
       `min ${accident.min}, courant ${accident.courant}, alerte ${accident.alerte}`);
  dire(accident.mode === 'pixel' && accident.lissage === true,
       'et il repasse en courbes lissees, au lieu de contours droits',
       `mode ${accident.mode}, lissage ${accident.lissage}`);
  dire(filiforme.mode === 'pixel' && filiforme.lissage === true && (filiforme.serre ?? 1) <= 0.6,
       '(temoin) le dessin filiforme, lui, recoit l\'ajustement SERRE, au plus pres du pixel',
       `mode ${filiforme.mode}, tolerance ${filiforme.serre}`);
  dire(filiforme.alerte === 'grave',
       '(temoin) un dessin vraiment filiforme reste averti, sinon on aurait '
       + 'simplement eteint l\'avertissement',
       `courant ${filiforme.courant}, alerte ${filiforme.alerte}`);
  // LES PETITS TEXTES SONT ANNONCES, arbitrage Alex du 26/08 au soir. Un mot
  // de 30 px de haut, HEINEKEN sur le logo U*BREW, sort approximatif de tout
  // trace automatique : ses fûts font 3 px. Le fichier concurrent qui est
  // net a cet endroit est un redessin humain. On le dit AVANT que le client
  // zoome, et on ne le dit pas quand le texte est grand. Il faut DEUX
  // couleurs : la granularite de la mesure est le plan de couleur.
  {
    const deuxCouleurs = (hautPetit) => {
      const L = 600, H = 600;
      const d = new Uint8ClampedArray(L * H * 4).fill(255);
      const poser = (x, y, r, v, b) => {
        const p = (y * L + x) * 4;
        d[p] = r; d[p + 1] = v; d[p + 2] = b; d[p + 3] = 255;
      };
      // six barres franches, la partie principale du dessin
      for (const x0 of [40, 130, 220, 310, 400, 490]) {
        for (let y = 40; y < 540; y++) for (let x = x0; x < x0 + 40; x++) poser(x, y, 20, 20, 20);
      }
      // quatre glyphes d'une autre couleur, pied commun, la petite mention
      // (la mesure exige au moins trois composantes alignees, comme du texte)
      for (const x0 of [60, 120, 180, 240]) {
        for (let y = 580 - hautPetit; y < 580; y++) {
          for (let x = x0; x < x0 + Math.round(hautPetit * 0.7); x++) poser(x, y, 180, 30, 30);
        }
      }
      return { largeur: L, hauteur: H, donnees: d, reduction: 1, largeurOrigine: L, hauteurOrigine: H };
    };
    const averts = (image) => (preparerVectorisation(image, mesurer(image)).avertissements ?? []);
    const petits = averts(deuxCouleurs(24));
    const grands = averts(deuxCouleurs(80));
    const avert = petits.find((a) => /petits textes/i.test(a.titre));
    dire(Boolean(avert), 'un texte de 24 px declenche l\'avertissement petits textes',
         petits.map((a) => a.titre).join(' | ') || 'aucun');
    dire(!grands.some((a) => /petits textes/i.test(a.titre)),
         '(temoin) le meme texte a 80 px ne le declenche pas');
    if (avert) {
      dire(/redessin/.test(avert.remede) && /graphiste/.test(avert.remede),
           'et sa sortie nomme le redessin, le travail du metier');
      dire(!/impossible|décevant|mauvais/i.test(avert.titre + avert.texte + avert.remede),
           'sans juger le fichier du client, sans dire impossible');
    }
  }

  // LA COULEUR SANS INTERIEUR, 26/08/2026, la lecon du mot « Eiffage ». La
  // palette se decide sur les pixels stables, et un texte en traits de deux
  // pixels n'en a aucun : sa couleur n'entrait jamais dans la palette, et le
  // vote de bord fondait le mot dans le cartouche qui le porte. Un mot
  // entier disparaissait du fichier livre, sans un avertissement. La mesure
  // repasse sur toute l'encre : une teinte assez couvrante, loin de chaque
  // couleur retenue, loin de chaque melange de deux couleurs retenues et du
  // fond, posee d'un seul tenant sur UNE seule couleur, est une couleur
  // reelle. Le temoin d'en face : des paillettes eparses de sonnerie JPEG
  // ne le sont pas.
  {
    const L = 200, H = 200;
    const d = new Uint8ClampedArray(L * H * 4).fill(255);
    const poser = (x, y, r, v, b) => {
      const p = (y * L + x) * 4;
      d[p] = r; d[p + 1] = v; d[p + 2] = b; d[p + 3] = 255;
    };
    // un aplat rouge, la couleur principale
    for (let y = 20; y < 100; y++) for (let x = 20; x < 100; x++) poser(x, y, 227, 73, 39);
    // un « mot » en marine, traits de 2 px poses sur le blanc : sans interieur
    for (const x0 of [120, 130, 140, 150]) {
      for (let y = 120; y < 150; y++) for (let x = x0; x < x0 + 2; x++) poser(x, y, 19, 35, 91);
    }
    for (let x = 120; x < 152; x++) for (let y = 150; y < 152; y++) poser(x, y, 19, 35, 91);
    // des paillettes eparses d'une teinte etrangere, facon sonnerie JPEG
    for (let k = 0; k < 60; k++) {
      const x = 12 + (k * 29) % 170, y = 160 + (k * 13) % 30;
      poser(x, y, 0, 140, 90); poser(x + 1, y, 0, 140, 90);
    }
    const image = { largeur: L, hauteur: H, donnees: d, reduction: 1, largeurOrigine: L, hauteurOrigine: H };
    const palette = mesurer(image).m2Couleurs.palette.map((c) => c.rvb);
    const proche = (rvb, cible, tol) => Math.hypot(rvb[0] - cible[0], rvb[1] - cible[1], rvb[2] - cible[2]) < tol;
    dire(palette.some((c) => proche(c, [19, 35, 91], 40)),
         'une couleur sans interieur stable entre quand meme dans la palette',
         palette.map((c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')).join(' '));
    dire(!palette.some((c) => proche(c, [0, 140, 90], 40)),
         '(temoin) des paillettes eparses n\'y entrent pas');
  }

  // LE TON. On enonce un fait sur notre outil, pas un verdict sur le logo, et
  // on donne les deux sorties du metier au lieu d'un seul ordre.
  const image = dessiner((poser) => {
    for (let k = 0; k < 20; k++) for (let y = 40; y < 540; y++) poser(40 + k * 28, y);
  });
  const texte = (preparerVectorisation(image, mesurer(image)).avertissements ?? [])
    .map((a) => `${a.titre} ${a.texte} ${a.remede}`).join(' ');
  dire(/redessin/.test(texte) && /graphiste/.test(texte),
       'le remede nomme le redessin, la sortie que les ateliers utilisent');
  dire(/pas un défaut de votre logo/.test(texte),
       'et le texte dit que ce n\'est pas un defaut du logo du client');
  dire(!/décevant/.test(texte),
       '(temoin) il ne juge plus le fichier du client par un adjectif');
  console.log('  ' + '-'.repeat(72));
}

// LES TEMOINS DE L'AJUSTEMENT DE COURBES, 26/08/2026.
//
// Les courbes du fichier livre ne viennent plus du mode spline de VTracer mais
// de notre ajustement sur son trace pixel (lissage.js, qui raconte pourquoi).
// Un ajusteur de courbes a trois manieres de mentir : arrondir un coin voulu,
// cranter une courbe voulue lisse, ou laisser filer une cubique hors du dessin
// entre deux points de mesure. Chacune a son temoin, et le troisieme a
// vraiment eu lieu : une tangente retournee au point de coupe (convention de
// Schneider) plantait une pointe de 150 px sous la serif du D pendant la mise
// au point. L'ecart radial du cercle, mesure LE LONG des courbes et pas
// seulement aux ancres, l'aurait attrapee.
{
  console.log('');
  console.log("  L'AJUSTEMENT DE COURBES, nos courbes sur le trace pixel");
  console.log('  ' + '-'.repeat(72));
  const dire = (ok, libelle, detail) => {
    console.log(`  ${ok ? 'ok   ' : 'ECHEC'} ${libelle}${detail ? `  [${detail}]` : ''}`);
    if (!ok) echecs++;
  };

  // LA TABLE DE DECISION, testee par la table : fabriquer une image de 21
  // megapixels pour voir le plafond agir serait le meme controle en 400 Mo.
  const filiforme = reglagesDuTrait(true, 250000);
  const courant = reglagesDuTrait(false, 250000);
  const geant = reglagesDuTrait(false, SURFACE_MAX_AJUSTEMENT_PX + 1);
  dire(filiforme.mode === 'pixel' && filiforme.lissage === true
       && filiforme.lissageReglages?.tolerance <= 0.6,
       'un trait limite trace le pixel exact et recoit l\'ajustement serre',
       `tolerance ${filiforme.lissageReglages?.tolerance}`);
  dire(courant.mode === 'pixel' && courant.lissage === true,
       'un dessin franc trace le pixel exact, et l\'ajustement s\'y applique');
  dire(geant.mode === 'spline' && !geant.lissage,
       'au dela du plafond de surface, le spline de VTracer reprend la main',
       `plafond ${SURFACE_MAX_AJUSTEMENT_PX} px`);
  dire(!('simplify' in filiforme) && !('simplify' in courant) && !('simplify' in geant),
       '(temoin) le reglage mort `simplify`, que VTracer ignorait, a disparu');

  // LA GRILLE FINE, decidee par la table elle aussi.
  dire(facteurSurEchantillon(416, 300) >= 3 && facteurSurEchantillon(416, 300) <= 4,
       'un petit logo recoit une grille trois a quatre fois plus fine',
       `416 x 300 : k = ${facteurSurEchantillon(416, 300)}`);
  dire(facteurSurEchantillon(1000, 1000) === 2,
       'un logo moyen en recoit une deux fois plus fine');
  dire(facteurSurEchantillon(2008, 1468) === 1,
       'au dela du plafond, la grille de la source suffit',
       `plafond ${SURFACE_SANS_SUR_ECHANTILLON_PX} px`);
  dire(facteurSurEchantillon(416, 300) * facteurSurEchantillon(416, 300) * 416 * 300 <= 4200000,
       '(temoin) le travail demande au vectoriseur reste borne');

  const boucleDe = (segments) => segments.filter((g) => g.type === 'courbe');
  const long = (v) => Math.hypot(v.x, v.y);

  // LE CERCLE : lisse partout, fidele partout. L'ecart radial est mesure le
  // long des courbes, pas seulement aux ancres : une cubique dont la poignee
  // se retourne passe pres de ses ancres et bombe entre elles.
  {
    const R = 30, pts = [];
    for (let a = 0; a < 720; a++) {
      const rad = a * Math.PI / 360;
      pts.push({ x: 100 + R * Math.cos(rad), y: 100 + R * Math.sin(rad) });
    }
    const segments = lisserBoucle(pts);
    const courbes = boucleDe(segments);
    let pire = 0;
    let prec = { x: segments[0].x, y: segments[0].y };
    for (const c of courbes) {
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const u = 1 - t;
        const x = u * u * u * prec.x + 3 * u * u * t * c.x1 + 3 * u * t * t * c.x2 + t * t * t * c.x;
        const y = u * u * u * prec.y + 3 * u * u * t * c.y1 + 3 * u * t * t * c.y2 + t * t * t * c.y;
        pire = Math.max(pire, Math.abs(Math.hypot(x - 100, y - 100) - R));
      }
      prec = { x: c.x, y: c.y };
    }
    // Cassures de tangente aux jonctions : sur un cercle, aucune n'est un coin.
    let pireAngle = 0;
    for (let i = 0; i < courbes.length; i++) {
      const a = courbes[i], b = courbes[(i + 1) % courbes.length];
      const tin = { x: a.x - a.x2, y: a.y - a.y2 };
      const tout = { x: b.x1 - a.x, y: b.y1 - a.y };
      const na = long(tin), nb = long(tout);
      if (!na || !nb) continue;
      const cos = Math.max(-1, Math.min(1, (tin.x * tout.x + tin.y * tout.y) / (na * nb)));
      pireAngle = Math.max(pireAngle, Math.acos(cos) * 180 / Math.PI);
    }
    dire(pire < 0.4, 'un cercle reste un cercle, a moins de 0,4 px pres le long des courbes',
         `ecart ${pire.toFixed(3)} px, ${courbes.length} courbes`);
    dire(pireAngle < 5, 'et aucune jonction du cercle ne casse la tangente',
         `pire cassure ${pireAngle.toFixed(2)} degres`);
    dire(courbes.length <= 12, 'sans emietter le trace en confettis', `${courbes.length} courbes`);
  }

  // LE CARRE : quatre coins voulus, quatre coins rendus, aucun arrondi.
  {
    const C = 60, pts = [];
    for (let i = 0; i < C; i++) pts.push({ x: 20 + i, y: 20 });
    for (let i = 0; i < C; i++) pts.push({ x: 20 + C, y: 20 + i });
    for (let i = 0; i < C; i++) pts.push({ x: 20 + C - i, y: 20 + C });
    for (let i = 0; i < C; i++) pts.push({ x: 20, y: 20 + C - i });
    const segments = lisserBoucle(pts);
    const traces = segments.filter((g) => g.type !== 'depart');
    const lignes = traces.filter((g) => g.type === 'ligne');
    const vrais = [[20, 20], [20 + C, 20], [20 + C, 20 + C], [20, 20 + C]];
    const ancres = segments.filter((g) => g.x !== undefined).map((g) => [g.x, g.y]);
    const rate = vrais.filter(([vx, vy]) =>
      !ancres.some(([ax, ay]) => Math.hypot(ax - vx, ay - vy) < 1)).length;
    dire(rate === 0, 'les quatre coins d\'un carre restent des coins, poses au pixel',
         `${traces.length} segments`);
    dire(traces.length === 4 && lignes.length === 4,
         'et un carre tient en quatre DROITES, une par cote',
         `${traces.length} segments dont ${lignes.length} droites`);
  }

  // LE BORD DROIT BRUITE : la lecon du logo U*BREW, 26/08 au soir. Le bord
  // haut du E est droit au pixel pres dans le masque, et l'ajustement le
  // livrait « presque droit », un flottement d'un pixel tolere par l'erreur
  // bornee. L'oeil lit ce flottement comme une vague sur un trait qu'il sait
  // droit. Ici : un rectangle dont chaque bord porte un bruit de un demi
  // pixel, comme en laisse l'antialiasing. Chaque cote doit sortir en DROITE
  // exacte, pas en courbe qui suit le bruit.
  {
    const L = 160, H = 60, pts = [];
    const bruit = (k) => 0.5 * Math.sin(k * 1.7);
    for (let i = 0; i < L; i++) pts.push({ x: 20 + i, y: 20 + bruit(i) });
    for (let i = 0; i < H; i++) pts.push({ x: 20 + L + bruit(i + 7), y: 20 + i });
    for (let i = 0; i < L; i++) pts.push({ x: 20 + L - i, y: 20 + H + bruit(i + 3) });
    for (let i = 0; i < H; i++) pts.push({ x: 20 + bruit(i + 11), y: 20 + H - i });
    const segments = lisserBoucle(pts);
    const traces = segments.filter((g) => g.type !== 'depart');
    const lignes = traces.filter((g) => g.type === 'ligne');
    // Chaque bord doit etre UNE droite. Le bruit peut arrondir un coin d'un
    // ou deux pixels, on tolere une petite courbe de raccord, jamais une
    // vague : au moins quatre droites, et jamais plus de six segments.
    dire(lignes.length >= 4 && traces.length <= 6,
         'un bord droit sous le bruit sort en droite exacte, pas en vague',
         `${traces.length} segments dont ${lignes.length} droites`);
  }

  // LA REMISE A L'APLOMB : un rectangle dessine avec 0,8 degre de derive,
  // comme en laisse un scan, ressort EXACTEMENT vertical et horizontal.
  // C'est la doctrine du 26/08 au soir : presque vertical EST vertical,
  // chaque fut du logo Chicago l'a paye une fois.
  {
    const pts = [];
    const a = 0.8 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
    const tourner = (x, y) => ({ x: 60 + x * ca - y * sa, y: 20 + x * sa + y * ca });
    const C = [[0, 0], [22, 0], [22, 120], [0, 120]];
    for (let k = 0; k < 4; k++) {
      const [x1, y1] = C[k], [x2, y2] = C[(k + 1) % 4];
      const nseg = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
      for (let i = 0; i < nseg; i++) pts.push(tourner(x1 + (x2 - x1) * i / nseg, y1 + (y2 - y1) * i / nseg));
    }
    const segments = lisserBoucle(pts);
    const lignes = [];
    let prec = { x: segments[0].x, y: segments[0].y };
    for (const g of segments) {
      if (g.type === 'ligne') lignes.push({ dx: Math.abs(g.x - prec.x), dy: Math.abs(g.y - prec.y) });
      if (g.type !== 'depart') prec = { x: g.x, y: g.y };
    }
    const aplombees = lignes.filter((l) => (l.dy > 40 && l.dx < 0.01) || (l.dx > 15 && l.dy < 0.01)).length;
    dire(lignes.length === 4 && aplombees === 4,
         'un rectangle qui derive de 0,8 degre ressort d\'equerre, quatre droites exactes',
         `${lignes.length} droites dont ${aplombees} a l'aplomb`);
  }

  // LE COIN PEU PRONONCE : la jonction fut-toit du logo Chicago tourne de
  // 30 degres. Elle recoit un coin, et les deux cotes sortent en droites.
  {
    const pts = [];
    const sommets = [[20, 140], [20, 20], [26, 20], [26, 80], [60, 138]];
    for (let k = 0; k < sommets.length; k++) {
      const [x1, y1] = sommets[k], [x2, y2] = sommets[(k + 1) % sommets.length];
      const nseg = Math.ceil(Math.hypot(x2 - x1, y2 - y1));
      for (let i = 0; i < nseg; i++) pts.push({ x: x1 + (x2 - x1) * i / nseg, y: y1 + (y2 - y1) * i / nseg });
    }
    const segments = lisserBoucle(pts);
    const ancres = segments.filter((g) => g.x !== undefined).map((g) => [g.x, g.y]);
    const auCoin = ancres.some(([x, y]) => Math.hypot(x - 26, y - 80) < 1.6);
    dire(auCoin, 'une jonction a 30 degres recoit son coin, elle n\'est plus enjambee',
         auCoin ? 'coin pose' : `ancres: ${ancres.map((p) => p.map((v) => v.toFixed(0)).join(',')).join(' ')}`);
  }

  // LE FLANC PLAT : un stade, flancs droits et bouts ronds raccordes sans
  // coin. Le C du logo Chicago bombait la : une seule cubique enjambait le
  // flanc et l'arrondi. La segmentation par courbure pose une DROITE sur le
  // flanc, et la courbe s'y raccorde tangentiellement.
  {
    const pts = [];
    const R = 25, x0 = 40, x1 = 100, y0 = 40, y1 = 180; // flancs verticaux de y0+R a y1-R
    const arcPts = (cx, cy, a0, a1) => {
      for (let d = 0; d <= 40; d++) { const t = a0 + (a1 - a0) * d / 40; pts.push({ x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) }); }
    };
    for (let y = y0 + R; y < y1 - R; y++) pts.push({ x: x1, y });
    arcPts(x1 - R, y1 - R, 0, Math.PI / 2);
    for (let x = x1 - R; x > x0 + R; x--) pts.push({ x, y: y1 });
    arcPts(x0 + R, y1 - R, Math.PI / 2, Math.PI);
    for (let y = y1 - R; y > y0 + R; y--) pts.push({ x: x0, y });
    arcPts(x0 + R, y0 + R, Math.PI, 3 * Math.PI / 2);
    for (let x = x0 + R; x < x1 - R; x++) pts.push({ x, y: y0 });
    arcPts(x1 - R, y0 + R, 3 * Math.PI / 2, 2 * Math.PI);
    const segments = lisserBoucle(pts);
    let flancs = 0;
    let prec = { x: segments[0].x, y: segments[0].y };
    for (const g of segments) {
      if (g.type === 'ligne') {
        const L = Math.hypot(g.x - prec.x, g.y - prec.y);
        if (L > 55 && (Math.abs(g.x - x0) < 0.7 || Math.abs(g.x - x1) < 0.7 || Math.abs(g.y - y0) < 0.7 || Math.abs(g.y - y1) < 0.7)) flancs++;
      }
      if (g.type !== 'depart') prec = { x: g.x, y: g.y };
    }
    // le stade est plus haut que large : seuls les deux flancs verticaux
    // depassent la longueur de droite, les bouts restent des arcs
    dire(flancs >= 2, 'les flancs plats d\'un stade sortent en droites, les bouts restent ronds',
         `${flancs} flancs droits`);
  }

  // LE COIN RECONSTRUIT : un carre aux coins ARRONDIS par deux pixels de
  // rayon, la signature que l'antialiasing laisse toujours. Le vrai coin du
  // dessin est a l'intersection des deux bords : il est repose la, pointe
  // vive, comme le ferait un graphiste.
  {
    const pts = [];
    const r = 2, x0 = 20, x1 = 100, y0 = 20, y1 = 100;
    const arcQ = (cx, cy, a0) => {
      for (let d = 1; d < 6; d++) { const t = a0 + (Math.PI / 2) * d / 6; pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }); }
    };
    for (let x = x0 + r; x <= x1 - r; x++) pts.push({ x, y: y0 });
    arcQ(x1 - r, y0 + r, -Math.PI / 2);
    for (let y = y0 + r; y <= y1 - r; y++) pts.push({ x: x1, y });
    arcQ(x1 - r, y1 - r, 0);
    for (let x = x1 - r; x >= x0 + r; x--) pts.push({ x, y: y1 });
    arcQ(x0 + r, y1 - r, Math.PI / 2);
    for (let y = y1 - r; y >= y0 + r; y--) pts.push({ x: x0, y });
    arcQ(x0 + r, y0 + r, Math.PI);
    const segments = lisserBoucle(pts);
    const ancres = segments.filter((g) => g.x !== undefined).map((g) => [g.x, g.y]);
    const vrais = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const reconstruits = vrais.filter(([vx, vy]) =>
      ancres.some(([axx, ayy]) => Math.hypot(axx - vx, ayy - vy) < 1.0)).length;
    dire(reconstruits === 4,
         'un coin arrondi par l\'antialiasing est repose a l\'intersection des bords',
         `${reconstruits} coins vifs sur 4`);
  }

  // LE BORD DROIT ENTRE DEUX COINS, 27/08/2026.
  //
  // CE QUI SE VOYAIT CHEZ ALEX. La contre-forme du A de Choose Chicago est un
  // trapeze : quatre bords droits, deux tres inclines. Elle sortait avec les
  // flancs bombes et le fond qui s'affaisse d'un pixel, et c'est exactement ce
  // qu'on regarde quand on dit qu'un fichier « n'est pas clean ».
  //
  // POURQUOI. Le contour d'un bord incline est un ESCALIER, et ses deux bouts
  // portent en plus le chanfrein du coin, un demi pixel a un pixel emousse par
  // l'antialiasing. `enDroite` juge l'arc AVEC ses deux bouts : un seul
  // echantillon de chanfrein a chaque extremite suffisait a lui faire refuser
  // la droite, et l'arc repartait en cubiques qui suivaient l'escalier marche
  // par marche. Le chanfrein appartient au COIN, pas au bord : on juge donc la
  // droite sur le milieu de l'arc, et le coin la reprend a l'intersection.
  //
  // Sur ce trapeze, avant : 32 segments, dont 28 droites, une par marche.
  // Apres : quatre droites, une par bord.
  {
    // Le contour PIXEL, celui que le vectoriseur produit : des marches
    // entieres, pas la ligne ideale.
    const contourPixel = (xg, xd, y0, y1) => {
      const pts = [];
      let x = Math.round(xd(y0));
      for (let y = y0; y <= y1; y++) {
        const nx = Math.round(xd(y));
        if (nx !== x) { pts.push({ x, y }); pts.push({ x: nx, y }); x = nx; }
        pts.push({ x, y: y + 1 });
      }
      let xl = Math.round(xg(y1 + 1));
      pts.push({ x: xl, y: y1 + 1 });
      for (let y = y1; y >= y0; y--) {
        const nx = Math.round(xg(y));
        if (nx !== xl) { pts.push({ x: xl, y: y + 1 }); pts.push({ x: nx, y: y + 1 }); xl = nx; }
        pts.push({ x: xl, y });
      }
      pts.push({ x: Math.round(xd(y0)), y: y0 });
      return pts;
    };
    const y0 = 20, y1 = 220;
    const pts = contourPixel((y) => 58 - 8 * (y - y0) / (y1 - y0),
                             (y) => 66 + 8 * (y - y0) / (y1 - y0), y0, y1);
    const segments = lisserBoucle(pts);
    const traces = segments.filter((g) => g.type !== 'depart');
    const lignes = traces.filter((g) => g.type === 'ligne');
    dire(lignes.length >= 4 && traces.length <= 5,
         'un trapeze a bords droits sort en quatre droites, pas en escalier',
         `${traces.length} segments dont ${lignes.length} droites`);
  }

  // LE TEMOIN DE L'AUTRE SENS, ET IL A DEJA SERVI DEUX FOIS. Un bout de trait
  // fin ressemble a un chanfrein : le chemin y fait demi tour, et les deux
  // flancs d'un trait d'un pixel tiennent a un demi pixel de leur axe commun,
  // donc l'arc qui descend l'un, contourne et remonte l'autre passe pour une
  // droite. Pose en droite unique, le trait se refermait SUR SON AXE et
  // disparaissait : le recouvrement de trait_01px tombait de 100 a 37 pour
  // cent, celui de trait_03px de 99,9 a 12,4. Ce controle tient la porte.
  {
    for (const epaisseur of [1, 3]) {
      const pts = [];
      const x0 = 60, y0 = 30, y1 = 250, e = epaisseur;
      for (let y = y0; y <= y1; y++) pts.push({ x: x0, y });
      pts.push({ x: x0 + e / 2, y: y1 + e / 2 });
      for (let y = y1; y >= y0; y--) pts.push({ x: x0 + e, y });
      pts.push({ x: x0 + e / 2, y: y0 - e / 2 });
      const segments = lisserBoucle(pts);
      const xs = segments.filter((g) => g.x !== undefined).map((g) => g.x);
      const largeur = Math.max(...xs) - Math.min(...xs);
      dire(largeur >= e * 0.8,
           `un trait de ${e} px garde sa largeur, son bout n'est pas un chanfrein`,
           `${largeur.toFixed(2)} px pour ${e}`);
    }
  }

  // LE GALBE VOULU, temoin de l'autre sens : un arc bombe de 3 px n'est pas
  // une droite qui a bouge, c'est un dessin. Il doit RESTER une courbe,
  // sinon on n'aurait pas pose un detecteur de droites, on aurait aplati le
  // dessin de tout le monde.
  {
    const pts = [];
    const L = 120, F = 3;
    for (let i = 0; i <= L; i++) pts.push({ x: 20 + i, y: 40 - F * Math.sin(Math.PI * i / L) });
    for (let i = L; i >= 0; i--) pts.push({ x: 20 + i, y: 44 + F * Math.sin(Math.PI * i / L) });
    const segments = lisserBoucle(pts);
    const traces = segments.filter((g) => g.type !== 'depart');
    const courbes = traces.filter((g) => g.type === 'courbe');
    dire(courbes.length >= 2, 'un galbe voulu de 3 px reste une courbe, il n\'est pas aplati',
         `${courbes.length} courbe(s) sur ${traces.length} segment(s)`);
  }

  // L'ELLIPSE EXACTE : un pois de bitmap est legerement patatoide, et l'oeil
  // d'un graphiste le voit. Une boucle qui tient contre une ellipse a la
  // tolerance pres sort en ellipse parfaite, quatre courbes symetriques.
  {
    const pts = [];
    for (let d = 0; d < 360; d += 2) {
      const t = d * Math.PI / 180, a = 31, b = 18.5, th = 0.35;
      const u = a * Math.cos(t), v = b * Math.sin(t);
      const bruit = 0.4 * Math.sin(d * 0.9);
      pts.push({ x: 100 + u * Math.cos(th) - v * Math.sin(th) + bruit,
                 y: 80 + u * Math.sin(th) + v * Math.cos(th) + bruit * 0.7 });
    }
    const segments = lisserBoucle(pts);
    const courbes = boucleDe(segments);
    // symetrie : le centre de la boite englobante des ancres est le centre
    const xs = segments.filter((g) => g.x !== undefined).map((g) => g.x);
    const ys = segments.filter((g) => g.y !== undefined).map((g) => g.y);
    const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;
    dire(courbes.length === 4, 'un pois au bruit pres sort en ellipse exacte, quatre courbes',
         `${courbes.length} courbes`);
    dire(Math.hypot(centreX - 100, centreY - 80) < 0.8, 'et elle est centree ou la mesure la voit',
         `centre (${centreX.toFixed(1)}, ${centreY.toFixed(1)})`);
  }

  // LE TEMOIN DE L'AUTRE SENS : un haricot, une bosse de 3 px sur un rond,
  // n'est PAS force a etre une ellipse. Sans ce temoin, la regularisation
  // serait un rouleau qui aplatit le dessin de tout le monde.
  {
    const pts = [];
    for (let d = 0; d < 360; d += 2) {
      const t = d * Math.PI / 180;
      const r = 25 + 3 * Math.exp(-((t - 1.2) ** 2) / 0.18);
      pts.push({ x: 100 + r * Math.cos(t), y: 80 + r * Math.sin(t) });
    }
    const segments = lisserBoucle(pts);
    const courbes = boucleDe(segments);
    // la bosse doit survivre : un point du trace passe pres de son sommet
    const apex = { x: 100 + 28 * Math.cos(1.2), y: 80 + 28 * Math.sin(1.2) };
    const ancres = segments.filter((g) => g.x !== undefined);
    const proche = ancres.some((g) => Math.hypot(g.x - apex.x, g.y - apex.y) < 3.5);
    dire(courbes.length > 4 && proche, 'un haricot reste un haricot : la bosse voulue survit',
         `${courbes.length} courbes, sommet ${proche ? 'garde' : 'PERDU'}`);
  }

  // L'ETOILE : dix pointes plus vives qu'un coin droit, aucune ne s'emousse.
  // C'est le cas du logo U*BREW, dont l'etoile est le motif central.
  {
    const pts = [];
    const sommets = [];
    for (let k = 0; k < 10; k++) {
      const r = k % 2 === 0 ? 40 : 16;
      const a = k * Math.PI / 5 - Math.PI / 2;
      sommets.push({ x: 100 + r * Math.cos(a), y: 100 + r * Math.sin(a) });
    }
    for (let k = 0; k < 10; k++) {
      const a = sommets[k], b = sommets[(k + 1) % 10];
      const n = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y));
      for (let i = 0; i < n; i++) pts.push({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n });
    }
    const segments = lisserBoucle(pts);
    const ancres = segments.filter((g) => g.x !== undefined).map((g) => [g.x, g.y]);
    const rate = sommets.filter((v) =>
      !ancres.some(([ax, ay]) => Math.hypot(ax - v.x, ay - v.y) < 1.2)).length;
    dire(rate === 0, 'les dix pointes d\'une etoile restent des pointes',
         `${rate} emoussee(s)`);
  }
  // LE COPEAU N'EST PAS UN DISQUE, la lecon du logo Pelican.
  //
  // Une boucle fine et legerement courbe, comme un trait de hachure, a ses deux
  // bords sur la meme courbe. Une ellipse ENORME passant par ce copeau reste a
  // moins de deux pixels de tous ses points, et son allongement vaut un : ni la
  // tolerance ni la borne d'allongement ne la refusaient. Trois copeaux du logo
  // Pelican ressortaient en disques noirs de cent pixels poses sur le dessin.
  // Une boucle qui EST une ellipse en fait le tour ; celle ci tient dans un
  // secteur etroit vu du centre de l'ellipse qu'on lui propose.
  {
    const pts = [];
    const RC = 250, A0 = -0.15, A1 = 0.15;
    for (let i = 0; i <= 90; i++) {
      const a = A0 + (A1 - A0) * (i / 90);
      pts.push({ x: 300 + RC * Math.cos(a), y: 300 + RC * Math.sin(a) });
    }
    for (let i = 90; i >= 0; i--) {
      const a = A0 + (A1 - A0) * (i / 90);
      pts.push({ x: 300 + (RC - 1) * Math.cos(a), y: 300 + (RC - 1) * Math.sin(a) });
    }
    const segments = lisserBoucle(pts, {});
    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const g of segments ?? []) {
      for (const v of [[g.x, g.y], [g.x1, g.y1], [g.x2, g.y2]]) {
        if (!Number.isFinite(v[0])) continue;
        xMin = Math.min(xMin, v[0]); xMax = Math.max(xMax, v[0]);
        yMin = Math.min(yMin, v[1]); yMax = Math.max(yMax, v[1]);
      }
    }
    // Le copeau fait soixante quinze pixels de long pour un de large : c'est sa
    // LARGEUR qui dit s'il a enfle. Verifie dans les deux sens : 94 px de large
    // sans la garde, 6 avec.
    dire(segments !== null && xMax - xMin < 15,
         'un copeau fin ne devient pas un disque',
         `largeur ${(xMax - xMin).toFixed(1)} px pour ${(yMax - yMin).toFixed(1)} de long`);
  }

  console.log('  ' + '-'.repeat(72));
}

// LE POIDS DU TRAIT, 26/08/2026.
//
// CE QU'IL GARDE. Le masque d'encre repond « il y a de l'encre ici » des qu'un
// pixel s'ecarte du fond de plus de six unites Lab, ce qui arrive des quatorze
// pour cent de couverture : c'est le bon seuil pour MESURER, on ne veut manquer
// aucun element du dessin. Tant que le vectoriseur tracait le contour de ce
// masque, le bord du fichier livre se posait 0,7 pixel trop loin, TOUT AUTOUR
// de chaque forme. Mesure sur le logo Choose Chicago : 46 972 pixels d'encre
// livres pour 42 283 de couverture reelle, onze pour cent de trop. Sur un fut
// de lettre de quatre pixels, cela fait trente pour cent de graisse.
//
// Le dessin de reference est trace EN COUVERTURE EXACTE, seize sous echantillons
// par pixel : sa surface vraie n'est donc pas estimee, elle est connue. Et la
// surface livree se calcule sur la GEOMETRIE du programme, pas sur un rendu :
// un rasteriseur qui arrondirait dans le meme sens que nous ferait un juge
// complaisant.
//
// Verifie dans les deux sens avant d'etre pose : + 10,6 pour cent avec la
// regle d'avant, + 0,3 avec celle d'apres.
{
  const L = 160, H = 160;
  const d = new Uint8ClampedArray(L * H * 4).fill(255);
  const SS = 16;
  const R = 18, CX = 55, CY = 55;
  const BX0 = 100.3, BX1 = 106.7, BY0 = 20.4, BY1 = 130.6;
  let vraie = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < L; x++) {
      let dedans = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const ux = x + (sx + 0.5) / SS, uy = y + (sy + 0.5) / SS;
          if (Math.hypot(ux - CX, uy - CY) <= R) dedans++;
          else if (ux >= BX0 && ux <= BX1 && uy >= BY0 && uy <= BY1) dedans++;
        }
      }
      const couverture = dedans / (SS * SS);
      vraie += couverture;
      const v = Math.round(255 * (1 - couverture));
      const p = (y * L + x) * 4;
      d[p] = v; d[p + 1] = v; d[p + 2] = v; d[p + 3] = 255;
    }
  }
  const image = { largeur: L, hauteur: H, donnees: d, reduction: 1,
                  largeurOrigine: L, hauteurOrigine: H };
  const prepare = preparerVectorisation(image, mesurer(image));
  const svg = vtracer.convertPixels(Buffer.from(prepare.pixels.buffer),
                                    prepare.largeur, prepare.hauteur, prepare.options);
  const programme = construireProgramme(svg, prepare.options);

  // Surface signee d'un sous chemin, cubiques aplaties : les contre formes
  // comptent en negatif, comme il se doit.
  const aireSousChemin = (segments) => {
    const pts = [];
    let x = 0, y = 0;
    for (const g of segments) {
      if (g.type === 'courbe') {
        for (let i = 1; i <= 16; i++) {
          const t = i / 16, u = 1 - t;
          pts.push({
            x: u * u * u * x + 3 * u * u * t * g.x1 + 3 * u * t * t * g.x2 + t * t * t * g.x,
            y: u * u * u * y + 3 * u * u * t * g.y1 + 3 * u * t * t * g.y2 + t * t * t * g.y,
          });
        }
      } else if (g.x !== undefined) {
        pts.push({ x: g.x, y: g.y });
      }
      if (g.x !== undefined) { x = g.x; y = g.y; }
    }
    let aire = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      aire += a.x * b.y - b.x * a.y;
    }
    return aire / 2;
  };
  let livree = 0;
  for (const forme of programme.formes) {
    if (forme.rvb[0] > 128 && forme.rvb[1] > 128 && forme.rvb[2] > 128) continue;
    for (const sc of forme.sousChemins) livree += aireSousChemin(sc.segments);
  }
  livree = Math.abs(livree);
  const derive = livree / vraie - 1;
  console.log('');
  console.log("  LE POIDS DU TRAIT, la surface livree contre la couverture reelle");
  console.log('  ' + '-'.repeat(72));
  const bon = Math.abs(derive) <= 0.03;
  console.log(`  ${bon ? 'ok   ' : 'ECHEC'} le fichier livre ne grossit pas le dessin`
    + `  [${Math.round(vraie)} px reels, ${Math.round(livree)} livres,`
    + ` ${derive >= 0 ? '+' : ''}${(100 * derive).toFixed(1)} pour cent]`);
  if (!bon) echecs++;
  console.log('  ' + '-'.repeat(72));
}

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
  // Ce temoin juge la QUANTIFICATION, qui se decide sur la grille de la
  // source : on l'appelle donc directement, sans passer par la grille fine
  // du sur echantillonnage, dont les indices ne sont plus ceux de l'image.
  const px = pixelsPourVectorisation(image, mesurer(image));
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
    svg = vtracer.convertPixels(Buffer.from(prepare.pixels.buffer), prepare.largeur, prepare.hauteur, prepare.options);
  } catch (e) {
    console.log(`  ECHEC ${cas.nom} : vectorisation impossible, ${e.message}`);
    echecs++;
    continue;
  }

  let programme, inv;
  try {
    programme = construireProgramme(svg, prepare.options);
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
  // LA BOITE HAUTE RESOLUTION, ET PAS L'ENTIERE, 26/08/2026.
  //
  // Un EPS porte les deux. %%BoundingBox est ARRONDIE AU POINT SUPERIEUR, parce
  // que la specification l'exige entiere ; %%HiResBoundingBox porte la vraie
  // valeur. Sur un fichier de cent millimetres, 284 contre 283,465, soit deux
  // dixiemes de pour cent.
  //
  // Ces deux dixiemes ont coute trois cas. Ghostscript cadre sur la boite HAUTE
  // RESOLUTION ; calculer la resolution sur l'entiere decalait donc l'image de
  // deux pixels au bord oppose, sur mille deux cents. Invisible sur un aplat,
  // fatal sur un trait de quatre pixels de large : trait_01px tombait a 66,9
  // pour cent de recouvrement, trait_03px a 86,4.
  //
  // C'est la meme famille que les erreurs d'unite du referentiel : deux
  // grandeurs qui se ressemblent ne sont pas la meme.
  const bbHaute = enteteEps.match(/%%HiResBoundingBox: 0 0 ([\d.]+) ([\d.]+)/);
  const bb = bbHaute || enteteEps.match(/%%BoundingBox: 0 0 ([\d.]+) ([\d.]+)/);
  if (!bb) {
    problemes.push('l\'EPS livre ne porte aucune boite englobante lisible');
  } else {
    const mm = (pt) => (Number(pt) * 25.4) / 72;
    const grand = Math.max(mm(bb[1]), mm(bb[2]));
    // La tolerance se resserre depuis qu'on lit la boite HAUTE RESOLUTION :
    // cent millimetres y tombent juste, a l'arrondi d'ecriture pres. Elle
    // valait un demi millimetre pour absorber l'arrondi au point superieur de
    // la boite entiere, et cette marge cachait l'ecart qui a coute trois cas.
    if (Math.abs(grand - 100) > 0.05) {
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
  // LA TAILLE DECLAREE SE LIT UNE FOIS, ET LES DEUX RASTERISATIONS LA RECOIVENT.
  // Elle etait lue dans le premier bloc et perdue dans le second : le second est
  // celui qui MESURE, et il rasterisait donc a l'ancienne resolution contre des
  // fichiers qui ne la portent plus.
  const largeurPt = bb ? Number(bb[1]) : null;
  if (avecGs) {
    let rEps, rPdf;
    try {
      rEps = rasteriser(base + '.eps', cas.largeur, cas.hauteur, largeurPt);
      rPdf = rasteriser(base + '.pdf', cas.largeur, cas.hauteur, largeurPt);
    } catch (e) {
      const message = (e.stdout ? e.stdout.toString() : e.message).split('\n').slice(0, 2).join(' ');
      problemes.push(`fichier illisible par le rasteriseur : ${message.trim()}`);
    }
  }
  if (avecGs && problemes.length === 0) {
    const rEps = rasteriser(base + '.eps', cas.largeur, cas.hauteur, largeurPt);
    const rPdf = rasteriser(base + '.pdf', cas.largeur, cas.hauteur, largeurPt);

    // Controle 1 : EPS et PDF doivent dessiner la meme chose.
    ecart = ecartPixels(rEps.pixels, rPdf.pixels);
    if (ecart > ECART_MAXIMAL_ENTRE_FORMATS) {
      problemes.push(`l'EPS et le PDF divergent sur ${(100 * ecart).toFixed(3)} pour cent des pixels`);
    }

    // Controle 2 : ressemblance a l'original.
    taux = recouvrement(
      masqueDepuisRvba(donnees, cas.largeur, cas.hauteur, 1),
      masqueAuCentre(rPdf.pixels, cas.largeur, cas.hauteur, ZOOM)
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
