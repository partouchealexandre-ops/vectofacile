/**
 * Du SVG au PROGRAMME DE TRACE, la forme intermediaire d'ou sortent l'EPS et
 * le PDF.
 *
 * Pourquoi une forme intermediaire plutot que deux traducteurs directs. Parce
 * que le client recoit DEUX fichiers qui doivent dessiner exactement la meme
 * chose. S'il existe deux chemins de traduction independants, ils divergeront,
 * et la divergence se decouvrira chez le marqueur, sur la presse. Avec un seul
 * programme de trace en amont, l'EPS et le PDF ne peuvent pas raconter deux
 * histoires : ils lisent la meme.
 *
 * Rappel de la decision metier du 17/08 (ARBITRE ALEX) : le livrable vectoriel
 * n'est PAS un SVG. Le SVG reste telechargeable en second, pour le site web du
 * client, mais la plupart des fabricants de goodies le refusent. Le SVG n'est
 * ici qu'un format de travail interne, la sortie du vectoriseur.
 */

export class SvgNonSupporte extends Error {}

/**
 * LE COTE MINIMAL D'UNE FORME LIVREE, en pixels de l'image d'origine.
 *
 * MESURE DU 26/08/2026, sur huit logos clients reels. Notre sortie sur le logo
 * de la Fondation de Nice comptait 3 652 formes la ou un dessin propre du meme
 * logo en compte une centaine. Distribution des tailles : 84 pour cent des
 * formes tenaient dans une boite de 2 x 2 pixels, et TOUTES les formes sous
 * 5 x 5 reunies pesaient 0,08 pour cent de la surface d'encre. Ce n'etait pas
 * du dessin, c'etait de la poussiere de compression JPEG transformee en
 * geometrie, et elle partait chez le marqueur.
 *
 * POURQUOI ON NE REACTIVE PAS filterSpeckle POUR AUTANT. Le filtre de VTracer
 * avait ete coupe le 18/08 parce qu'il supprimait un trait de 1 px de large sur
 * 221 de long. C'est normal : IL FILTRE PAR AIRE, et un filet a une petite
 * aire. Ce filtre ci regarde la BOITE ENGLOBANTE, et il ne retire une forme que
 * si elle est petite DANS LES DEUX DIRECTIONS. Une poussiere l'est ; un filet
 * ne l'est pas, sa boite reste longue, il survit. C'est la meme doctrine que
 * pour la mesure du trait : un controle qui ne regarde qu'une direction ne
 * mesure pas une epaisseur.
 *
 * ET IL COMPTE CE QU'IL RETIRE. Un nettoyage muet est un mensonge par omission.
 */
export const COTE_MINIMAL_FORME = 2;

/** La boite englobante d'une forme, tous sous chemins confondus. */
function boiteDeLaForme(forme) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const sousChemin of forme.sousChemins) {
    for (const s of sousChemin.segments) {
      for (const x of [s.x, s.x1, s.x2]) {
        if (!Number.isFinite(x)) continue;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
      }
      for (const y of [s.y, s.y1, s.y2]) {
        if (!Number.isFinite(y)) continue;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (!Number.isFinite(x0) || !Number.isFinite(y0)) return null;
  return { largeur: x1 - x0, hauteur: y1 - y0 };
}

/**
 * Retire les formes petites dans les deux directions, et dit combien.
 *
 * La forme ENTIERE est jugee, jamais un sous chemin isole : le trou d'un « o »
 * est un sous chemin minuscule dans une forme qui ne l'est pas, et le retirer
 * boucherait la contre forme.
 */
export function retirerLaPoussiere(programme, cote = COTE_MINIMAL_FORME) {
  if (!(cote > 0)) return { ...programme, poussiere: { formes: 0, surface: 0 } };
  const gardees = [];
  let retirees = 0;
  let surfaceRetiree = 0;
  let surfaceTotale = 0;
  for (const forme of programme.formes) {
    const boite = boiteDeLaForme(forme);
    const aire = boite ? Math.max(boite.largeur, 0) * Math.max(boite.hauteur, 0) : 0;
    surfaceTotale += aire;
    if (boite && Math.max(boite.largeur, boite.hauteur) < cote) {
      retirees += 1;
      surfaceRetiree += aire;
      continue;
    }
    gardees.push(forme);
  }
  return {
    ...programme,
    formes: gardees,
    poussiere: {
      formes: retirees,
      cote,
      part: surfaceTotale > 0 ? surfaceRetiree / surfaceTotale : 0,
    },
  };
}

import { lireChemin } from './chemins.js';
import { lisserProgramme } from './lissage.js';

const BALISES_ADMISES = new Set(['svg', 'path', 'g', 'title', 'desc', 'defs', 'metadata']);

function lireAttributs(balise) {
  const attributs = {};
  const motif = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"|([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*'([^']*)'/g;
  let m;
  while ((m = motif.exec(balise)) !== null) {
    if (m[1] !== undefined) attributs[m[1]] = m[2];
    else attributs[m[3]] = m[4];
  }
  return attributs;
}

function couleurVersRvb(valeur) {
  if (!valeur) return null;
  const v = valeur.trim().toLowerCase();
  if (v === 'none') return null;
  let m = /^#([0-9a-f]{6})$/.exec(v);
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  m = /^#([0-9a-f]{3})$/.exec(v);
  if (m) {
    const c = m[1];
    return [parseInt(c[0] + c[0], 16), parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16)];
  }
  m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/.exec(v);
  if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
  if (v === 'black') return [0, 0, 0];
  if (v === 'white') return [255, 255, 255];
  throw new SvgNonSupporte(
    `couleur de remplissage non geree : ${valeur}. Les degrades et les motifs `
    + "n'ont pas d'equivalent fiable en marquage, ils ne doivent pas passer en silence."
  );
}

/**
 * Construit le programme de trace a partir d'une chaine SVG.
 * Le controle est volontairement strict : toute balise inattendue leve une
 * erreur nommee plutot que d'etre ignoree. Une balise ignoree, c'est un morceau
 * de logo qui disparait du fichier livre sans que personne ne s'en apercoive.
 */
export function construireProgramme(svg, options = {}) {
  const balises = svg.match(/<[^>?!][^>]*>/g) || [];
  const formes = [];
  let largeur = null, hauteur = null;

  for (const balise of balises) {
    const nom = /^<\s*([a-zA-Z][-a-zA-Z0-9]*)/.exec(balise);
    if (!nom) continue;
    const nomBalise = nom[1].toLowerCase();
    if (!BALISES_ADMISES.has(nomBalise)) {
      throw new SvgNonSupporte(
        `balise SVG non geree : ${nomBalise}. Le convertisseur refuse plutot que `
        + "de livrer un fichier ampute."
      );
    }
    const attributs = lireAttributs(balise);

    if (nomBalise === 'svg') {
      if (attributs.viewBox) {
        const v = attributs.viewBox.trim().split(/[\s,]+/).map(Number);
        if (v.length === 4) { largeur = v[2]; hauteur = v[3]; }
      }
      if (largeur === null && attributs.width) largeur = parseFloat(attributs.width);
      if (hauteur === null && attributs.height) hauteur = parseFloat(attributs.height);
    }

    if (nomBalise === 'path') {
      const rvb = couleurVersRvb(attributs.fill ?? '#000000');
      if (rvb === null) continue;
      const opacite = attributs['fill-opacity'] !== undefined
        ? parseFloat(attributs['fill-opacity'])
        : 1;
      formes.push({
        rvb,
        opacite,
        regle: (attributs['fill-rule'] || 'nonzero').toLowerCase() === 'evenodd' ? 'evenodd' : 'nonzero',
        sousChemins: lireChemin(attributs.d || ''),
      });
    }
  }

  if (largeur === null || hauteur === null || !(largeur > 0) || !(hauteur > 0)) {
    throw new SvgNonSupporte("dimensions du SVG introuvables ou nulles.");
  }

  // LE NETTOYAGE SE FAIT ICI, PAS CHEZ L'APPELANT. Deux appelants, la page et
  // le harnais, et un seul qui y penserait serait deux fichiers differents pour
  // le meme logo. La lecon du 26/08 sur la taille des fichiers livres.
  const programme = retirerLaPoussiere({ largeur, hauteur, formes }, options.cote ?? COTE_MINIMAL_FORME);

  // L'AJUSTEMENT AUSSI, et pour la meme raison. Le drapeau vient des options
  // du vectoriseur (reglagesDuTrait) : quand le trace est l'escalier pixel,
  // c'est ici qu'il devient courbes. Apres la poussiere : ajuster des formes
  // qui vont etre retirees serait du travail jete.
  if (options.lissage) lisserProgramme(programme);
  return programme;
}

/** Inventaire du programme, utile au harnais et a l'affichage. */
export function inventaire(programme) {
  let sousChemins = 0, segments = 0, courbes = 0;
  const couleurs = new Set();
  for (const f of programme.formes) {
    couleurs.add(f.rvb.join(','));
    for (const s of f.sousChemins) {
      sousChemins++;
      segments += s.segments.length;
      courbes += s.segments.filter((g) => g.type === 'courbe').length;
    }
  }
  return {
    formes: programme.formes.length,
    couleurs: couleurs.size,
    sousChemins,
    segments,
    courbes,
    largeur: programme.largeur,
    hauteur: programme.hauteur,
  };
}
