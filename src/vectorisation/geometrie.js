/**
 * Passage du programme de trace aux coordonnees du fichier livre.
 *
 * Deux choses changent entre le SVG et les formats d'impression :
 *   l'axe Y, qui descend en SVG et monte en PostScript comme en PDF ;
 *   l'unite, le pixel en SVG, le point typographique dans les deux autres.
 *
 * On applique la transformation NUMERIQUEMENT, pas par une matrice posee en
 * tete de fichier. C'est plus verbeux et c'est voulu : l'EPS et le PDF portent
 * alors exactement les memes nombres, et une divergence entre les deux
 * fichiers livres devient impossible a cacher.
 */

export const POINTS_PAR_MM = 72 / 25.4;

/** Arrondi d'affichage, trois decimales, sans zeros inutiles. */
export function nb(valeur) {
  const arrondi = Math.round(valeur * 1000) / 1000;
  return Object.is(arrondi, -0) ? '0' : String(arrondi);
}

/**
 * @param {object} programme
 * @param {{largeurMm?: number}} options
 * @returns {{echelle: number, largeurPt: number, hauteurPt: number, largeurMm: number|null}}
 */
export function calculerCadre(programme, options = {}) {
  const largeurMm = options.largeurMm ?? null;
  const echelle = largeurMm
    ? (largeurMm * POINTS_PAR_MM) / programme.largeur
    : 1;
  return {
    echelle,
    largeurPt: programme.largeur * echelle,
    hauteurPt: programme.hauteur * echelle,
    largeurMm,
    hauteurMm: largeurMm ? (programme.hauteur * echelle) / POINTS_PAR_MM : null,
  };
}

/**
 * Emet la geometrie d'une forme dans la syntaxe demandee.
 *
 * PostScript et PDF sont POSTFIXES : les operandes precedent l'operateur,
 * "x y moveto". SVG est PREFIXE : "M x y". Trois formats, deux ordres, et un
 * seul parcours de segments : l'ordre est un reglage, mots.prefixe.
 *
 * Oubli paye le 18/08 : le premier SVG reecrit sortait en notation postfixee et
 * Chromium refusait la totalite des chemins. Le harnais de bout en bout l'a vu
 * immediatement, ce qui est precisement pourquoi il ouvre un vrai navigateur
 * plutot que de se fier a une chaine de caracteres.
 */
export function emettreForme(forme, cadre, hauteurSvg, mots, transformation = null) {
  const lignes = [];
  const X = transformation ? transformation.X : (x) => nb(x * cadre.echelle);
  const Y = transformation ? transformation.Y : (y) => nb((hauteurSvg - y) * cadre.echelle);

  const emettre = (operandes, operateur) => {
    lignes.push(mots.prefixe ? `${operateur} ${operandes.join(' ')}` : `${operandes.join(' ')} ${operateur}`);
  };

  for (const sousChemin of forme.sousChemins) {
    if (sousChemin.segments[0]?.type !== 'depart') {
      throw new Error(
        "sous chemin sans point de depart. Ni PostScript ni PDF n'acceptent un "
        + "trace sans point courant : on refuse d'ecrire un fichier inouvrable."
      );
    }
    for (const s of sousChemin.segments) {
      if (s.type === 'depart') emettre([X(s.x), Y(s.y)], mots.allerA);
      else if (s.type === 'ligne') emettre([X(s.x), Y(s.y)], mots.ligne);
      else emettre([X(s.x1), Y(s.y1), X(s.x2), Y(s.y2), X(s.x), Y(s.y)], mots.courbe);
    }
    if (sousChemin.ferme) lignes.push(mots.fermer);
  }
  return lignes;
}
