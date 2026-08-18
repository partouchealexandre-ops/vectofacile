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

import { lireChemin } from './chemins.js';

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
export function construireProgramme(svg) {
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

  return { largeur, hauteur, formes };
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
