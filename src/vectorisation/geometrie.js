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

/**
 * LA TAILLE DECLAREE DU FICHIER LIVRE, arbitrage Alex du 26/08/2026.
 *
 * CE QUI N'ALLAIT PAS, et Alex l'a vu sur un vrai fichier. Ni versEps ni
 * versPdf ne recevaient jamais de largeur : l'appel etait
 * `versPdf(programme, { titre })`, sans plus. Le cadre retombait donc sur son
 * echelle par defaut, UN POINT PAR PIXEL, et la taille physique du fichier
 * livre n'etait plus une decision mais le nombre de pixels de ce que le
 * visiteur avait depose. Un logo de 1 270 px ressortait en page de 448 mm ;
 * le meme logo en 500 px serait ressorti en 176 mm. Deux personnes, le meme
 * dessin, deux fichiers qu'un marqueur place a des tailles differentes.
 *
 * Le pire est que l'intention etait ecrite : les deux formats portent une
 * branche « taille de marquage demandee » qui ne s'executait jamais, faute que
 * la valeur arrive. Du code ecrit pour une chose qui n'etait pas branchee.
 *
 * CENT MILLIMETRES SUR LA PLUS GRANDE DIMENSION quand personne n'a rien
 * demande. Le nombre est rond, neutre, et dans l'ordre de grandeur d'un
 * marquage courant. Il ne pretend rien : un fichier vectoriel se redimensionne
 * sans perte, et ce que la page declare est un point de depart lisible, pas
 * une contrainte. Ce qu'on gagne, c'est que deux visiteurs avec le meme logo
 * recoivent desormais le meme fichier.
 *
 * SUR LA PLUS GRANDE DIMENSION, et c'est la meme regle que partout ailleurs
 * dans ce projet : elle porte le moins d'erreur relative. Un logo plus haut
 * que large sort donc a cent millimetres de HAUT.
 */
export const TAILLE_LIVREE_MM = 100;

export function largeurLivreeMm(programme, largeurDemandeeMm = null) {
  if (Number.isFinite(largeurDemandeeMm) && largeurDemandeeMm > 0) return largeurDemandeeMm;
  const { largeur, hauteur } = programme ?? {};
  if (!(largeur > 0) || !(hauteur > 0)) return TAILLE_LIVREE_MM;
  return largeur >= hauteur ? TAILLE_LIVREE_MM : (TAILLE_LIVREE_MM * largeur) / hauteur;
}

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
