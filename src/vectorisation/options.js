import { versLab, ecartLab, creerCacheLab } from '../moteur/couleurs.js';

/**
 * Reglages du vectoriseur DEDUITS des mesures du moteur.
 *
 * C'est la jointure entre les deux moities du produit, et elle porte tout son
 * interet : le fichier livre est vectorise avec la palette que le diagnostic a
 * ANNONCEE. Si l'ecran dit six couleurs, l'EPS en porte six, exactement les
 * memes. Sans cette jointure, le vectoriseur requantifie de son cote et le
 * client recoit un fichier qui contredit le diagnostic qu'il vient de lire.
 *
 * Piege paye une fois, garde ici en clair. La palette du moteur est la palette
 * de l'ENCRE : le fond en est exclu, c'est sa definition. VTracer, lui, veut la
 * palette de l'IMAGE. Passer la palette d'encre telle quelle donne un
 * vectoriseur qui n'a qu'une couleur disponible et rend un rectangle plein de
 * la taille du fichier. Le harnais a montre le cas sur quatorze images sur
 * quinze, avec un recouvrement de 0,4 pour cent la ou on attendait 99.
 */

/**
 * Part des pixels d'encre hors palette au dela de laquelle le fichier n'est pas
 * un dessin a aplats.
 *
 * Mesure du 18/08 sur une image de bruit : 86 pour cent des pixels d'encre ne
 * correspondent a AUCUNE couleur retenue. Sur un logo, meme tres compresse,
 * meme sorti d'un scan de charte, cette part est nulle ou quasi nulle. Le
 * discriminant est donc franc, il n'y a pas de zone grise a arbitrer.
 *
 * Ce que le garde-fou evite n'est pas seulement une lenteur. Vectoriser cette
 * image produisait 457 260 formes en 34 secondes : l'onglet du visiteur gelait,
 * et le fichier livre aurait ete inutilisable par n'importe quel marqueur. Un
 * refus explique en une seconde vaut mieux qu'un fichier absurde en trente.
 */
export const PART_HORS_PALETTE_MAXIMALE = 0.45;

/*
 * Pourquoi 0,45 et pas la moitie de l'ecart.
 *
 * Les fichiers legitimes mesures le 18/08, logos compresses, scans de charte,
 * exports webp, sont TOUS a 0,00. Le bruit est a 0,87. N'importe quelle valeur
 * entre les deux marcherait, et c'est justement pour ca qu'il faut choisir en
 * pensant a l'erreur qu'on prefere commettre.
 *
 * Refuser a tort le logo textures d'un vrai client coute plus cher que laisser
 * passer une image lente : le plafond de formes attrape ensuite le cas absurde,
 * alors que rien ne rattrape un client a qui on a dit a tort "ce n'est pas un
 * dessin". On se place donc pres du bruit, pas au milieu.
 */

/** Au dela de ce nombre de formes, le fichier livre n'est marquable nulle part. */
export const FORMES_MAXIMALES = 4000;

/**
 * Le fichier est il un dessin a aplats, ou une photo ?
 * Rend null si c'est un dessin, sinon la raison du refus, en clair.
 */
export function refusDeVectorisation(mesures) {
  const part = mesures.m2Couleurs.partHorsPalette ?? 0;
  if (part > PART_HORS_PALETTE_MAXIMALE) {
    return {
      motif: 'photo',
      texte: `${Math.round(100 * part)} pour cent des pixels de ce fichier ne correspondent `
        + "a aucune couleur franche : c'est une photo ou une image bruitee, pas un dessin. "
        + "La vectoriser produirait des dizaines de milliers de formes, inutilisables par "
        + "un marqueur. Le diagnostic ci dessus reste valable, il decrit bien votre fichier.",
    };
  }
  return null;
}

/**
 * @param {object} mesures  sortie de mesurer()
 * @param {object} reglages surcharges eventuelles
 */
export function optionsDepuisMesures(mesures, reglages = {}) {
  const palette = mesures.m2Couleurs.palette.map((c) => c.hex.toUpperCase());

  // Le fond, quand il est une couleur, fait partie de la palette de l'image.
  if (mesures.fond.type === 'couleur' && mesures.fond.rvb) {
    const hexFond = '#' + mesures.fond.rvb.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    if (!palette.includes(hexFond)) palette.unshift(hexFond);
  }

  // Le MODE se deduit du trait le plus fin mesure, et c'est la deuxieme
  // jointure entre le moteur et le vectoriseur.
  //
  // Mesure faite le 18/08 : en mode spline, un trait de 1 px est rendu par une
  // courbe dont les deux bords se croisent, et le rendu n'en couvre plus que
  // 60 pour cent. La tolerance de lissage est alors plus large que la forme
  // elle meme, elle ne peut que la deformer. En mode polygon, le meme trait
  // sort exact.
  //
  // Sous 3 px de trait, on renonce donc aux courbes. Le fichier est un peu plus
  // anguleux, il est JUSTE, et le diagnostic dira par ailleurs que le fichier
  // d'origine est trop petit pour ce qu'il contient.
  const traitBasse = mesures.m5TraitLePlusFin?.encadrementPx?.basse ?? null;
  const traitLimite = traitBasse !== null && traitBasse <= 2;
  const avertissements = [];
  if (traitLimite) {
    // L'avertissement DIT CE QU'IL FAUT FAIRE, et il le chiffre.
    //
    // Reecrit le 19/08 apres le premier vrai logo passe dans la chaine : une
    // cible avec une ligne de texte, en 101 x 57 pixels. Le moteur avait
    // parfaitement mesure, trait a 1 pixel, et l'outil a quand meme livre un
    // .eps ou le texte etait fondu en une seule tache. L'avertissement existait
    // et disait vrai, mais il ne disait pas quoi faire, et il s'affichait en
    // petit gris SOUS les boutons de telechargement.
    //
    // A 1 pixel, un trait n'a pas d'interieur : sa ligne moyenne et son
    // contour sont les memes pixels, donc tout trace est une supposition. Le
    // facteur annonce est de l'arithmetique, pas un seuil : pour obtenir un
    // trait de 4 pixels a partir d'un trait de 1, il faut une image quatre
    // fois plus large.
    const facteur = Math.max(2, Math.ceil(4 / Math.max(traitBasse, 1)));
    const dimensions = mesures.m1Dimensions
      ? `${mesures.m1Dimensions.largeurPx} par ${mesures.m1Dimensions.hauteurPx} pixels`
      : 'de petite taille';
    avertissements.push({
      gravite: traitBasse <= 1 ? 'grave' : 'notable',
      titre: traitBasse <= 1
        ? "Votre image est trop petite pour son propre dessin"
        : "Votre image est juste a la limite",
      texte: `Elle mesure ${dimensions}, et son trait le plus fin y fait `
        + `${traitBasse} pixel${traitBasse > 1 ? 's' : ''}. A cette taille, le trace ne `
        + `peut pas restituer le detail : les petits textes se remplissent et les `
        + `courbes deviennent anguleuses. Nous vectorisons quand meme, en contours `
        + `droits et sans lissage pour ne rien inventer, mais le resultat sera `
        + `decevant.`,
      remede: `Cherchez une version au moins ${facteur} fois plus large de votre logo : `
        + `le PDF d'une plaquette, l'export d'origine, ou le fichier de votre graphiste. `
        + `Aucun reglage ne remplace des pixels absents.`,
    });
  }

  const reglagesTrait = traitLimite
    ? { mode: 'polygon' }
    : { mode: 'spline', simplify: Math.min(1.2, Math.max(0.3, traitBasse === null ? 1.2 : traitBasse / 4)) };

  return {
    ...reglagesTrait,
    hierarchical: 'cutout',
    palette,
    // filterSpeckle a ZERO, et ce n'est pas un oubli.
    //
    // Mesure faite le 18/08 sur le corpus synthetique : des la valeur 1, le
    // filtre de VTracer SUPPRIME un trait de 1 px de large, quelle que soit sa
    // longueur. Sur une image de 300 x 300, un trait de 221 pixels d'aire a
    // disparu du fichier livre sans le moindre avertissement. Le recouvrement
    // avec l'original est tombe a zero pour cent.
    //
    // Un logo perdant un filet ou un contour fin part chez le marqueur, et
    // personne ne s'en apercoit avant la presse. On coupe donc le filtre, et le
    // nettoyage se fait en amont, par nettoyerSalissures, qui lui COMPTE ce
    // qu'il retire et le dit au client.
    filterSpeckle: 0,
    ...reglages,
    _avertissements: avertissements,
  };
}

/**
 * Point d'entree unique de la preparation : les reglages du vectoriseur, les
 * pixels a lui donner, et ce qu'il faut dire au client.
 * Le navigateur et le harnais appellent CETTE fonction, jamais les deux
 * moities separement : c'est ce qui garantit qu'ils vectorisent pareil.
 */
export function preparerVectorisation(image, mesures, reglages = {}) {
  const refus = refusDeVectorisation(mesures);
  if (refus) return { refus, options: null, pixels: null, avertissements: [] };
  const options = optionsDepuisMesures(mesures, reglages);
  const avertissements = options._avertissements;
  delete options._avertissements;
  return { refus: null, options, pixels: pixelsPourVectorisation(image, mesures), avertissements };
}

/**
 * Pixels a envoyer au vectoriseur : l'image ramenee A LA PALETTE ANNONCEE.
 *
 * Chaque pixel de fond redevient le fond, chaque pixel d'encre prend la couleur
 * reelle la plus proche, les salissures deja reperees ont disparu avec le
 * masque. Le vectoriseur recoit donc une image parfaitement plate.
 *
 * Sans cette etape, avec le filtre de taches coupe, les 3 330 pixels sales du
 * cas halo_0370 devenaient 2 331 formes distinctes dans l'EPS livre, pour un
 * dessin qui en compte deux. Le fichier partait au marqueur charge de bruit de
 * compression transforme en geometrie. La quantification prealable ramene le
 * meme cas a deux formes.
 *
 * Effet de bord assume : l'antialiasing disparait. Ce n'est pas une perte, un
 * fichier de marquage n'a pas de demi teinte de bord, et VTracer lisse ensuite
 * les contours en splines.
 */
export function pixelsPourVectorisation(image, mesures) {
  const { largeur, hauteur, donnees } = image;
  const masque = mesures.masqueEncre;
  if (!masque) return donnees;

  const fondRvb = mesures.fond.type === 'couleur' ? mesures.fond.rvb : null;
  const palette = mesures.m2Couleurs.palette.map((c) => ({ rvb: c.rvb, lab: versLab(c.rvb[0], c.rvb[1], c.rvb[2]) }));
  const lab = creerCacheLab();
  const propre = new Uint8ClampedArray(donnees.length);

  for (let i = 0; i < largeur * hauteur; i++) {
    const p = i * 4;
    if (!masque[i]) {
      if (fondRvb) {
        propre[p] = fondRvb[0]; propre[p + 1] = fondRvb[1]; propre[p + 2] = fondRvb[2]; propre[p + 3] = 255;
      } else {
        propre[p] = 0; propre[p + 1] = 0; propre[p + 2] = 0; propre[p + 3] = 0;
      }
      continue;
    }
    if (palette.length === 0) {
      propre[p] = donnees[p]; propre[p + 1] = donnees[p + 1]; propre[p + 2] = donnees[p + 2]; propre[p + 3] = 255;
      continue;
    }
    const teinte = lab(donnees[p], donnees[p + 1], donnees[p + 2]);
    let meilleur = palette[0], distance = Infinity;
    for (const c of palette) {
      const d = ecartLab(teinte, c.lab);
      if (d < distance) { distance = d; meilleur = c; }
    }
    propre[p] = meilleur.rvb[0]; propre[p + 1] = meilleur.rvb[1]; propre[p + 2] = meilleur.rvb[2]; propre[p + 3] = 255;
  }
  return propre;
}
