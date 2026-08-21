/**
 * CE QUE CHAQUE TECHNIQUE DEMANDE AU FICHIER.
 *
 * ARBITRÉ ALEX du 20/08/2026, et c'est un correctif de justesse : le site
 * fermait des portes ouvertes.
 *
 * Il affichait, a l'endroit exact ou le visiteur decouvre son resultat :
 * « sans fichier vectoriel, oubliez la tampographie, la serigraphie et la
 * gravure laser [...] votre image serait donc refusee en l'etat. » La premiere
 * partie est vraie. La conclusion etait fausse. Le transfert numerique,
 * l'impression numerique et la sublimation acceptent parfaitement un fichier
 * raster : le site repondait « non » a quelqu'un dont le fichier fonctionne
 * deja.
 *
 * LA RAISON EST MECANIQUE, et elle se dit au visiteur en une phrase :
 *
 *   les techniques qui fabriquent un OUTIL a partir du dessin (un ecran, un
 *   cliche, un fichier de broderie, une matrice, un film decoupe) ont besoin
 *   de COURBES : on ne grave pas un cliche a partir de pixels ;
 *
 *   les techniques qui IMPRIMENT UNE IMAGE n'ont besoin que d'une image.
 *
 * Consequence sur le verdict, et c'est tout l'interet : un JPEG net rend un
 * OUI immediat sur la moitie des techniques. La vectorisation redevient ce
 * qu'elle est, une facon d'ouvrir les autres portes, pas un peage a l'entree.
 *
 * UNE TECHNIQUE ABSENTE DE CETTE TABLE N'EST PAS AUTORISEE PAR DEFAUT. La base
 * de travail evolue ; si elle introduit un nom inconnu, le harnais echoue et
 * quelqu'un tranche. Doctrine du referentiel : une valeur absente n'est pas
 * une autorisation.
 */

/** Fabrique un outil a partir du dessin. Exige des courbes. */
const OUTIL = 'outil';
/** Imprime une image. Une image suffit. */
const IMAGE = 'image';

/**
 * La table. `famille` rattache le nom commercial du grossiste a la technique du
 * referentiel, celle qui porte les guides et les mecaniques de couleur.
 */
export const TECHNIQUES = Object.freeze({
  'Sérigraphie': { procede: OUTIL, famille: 'serigraphie', outil: 'un écran' },
  'Sérigraphie circulaire': { procede: OUTIL, famille: 'serigraphie', outil: 'un écran' },
  'Transfert sérigraphique': { procede: OUTIL, famille: 'serigraphie', outil: 'un écran' },
  'Tampographie': { procede: OUTIL, famille: 'tampographie', outil: 'un cliché' },
  'Gravure laser': { procede: OUTIL, famille: 'gravure_laser', outil: 'un tracé de gravure' },
  'Gravure laser 360': { procede: OUTIL, famille: 'gravure_laser', outil: 'un tracé de gravure' },
  'Broderie': { procede: OUTIL, famille: 'broderie', outil: 'un fichier de points' },
  'Embossage': { procede: OUTIL, famille: 'marquage_a_chaud', outil: 'une matrice' },
  'Marquage à chaud': { procede: OUTIL, famille: 'marquage_a_chaud', outil: 'une matrice' },
  'Transfert réfléchissant': { procede: OUTIL, famille: 'transfert_dtf', outil: 'un tracé de découpe' },
  'Transfert numérique': { procede: IMAGE, famille: 'transfert_dtf' },
  'Impression numérique': { procede: IMAGE, famille: 'numerique_uv' },
  'Impression numérique 360': { procede: IMAGE, famille: 'numerique_uv' },
  'Sublimation': { procede: IMAGE, famille: 'transfert_dtf' },
  'Étiquette numérique': { procede: IMAGE, famille: 'numerique_uv' },
  'Doming': { procede: IMAGE, famille: 'numerique_uv' },
});

/** Vrai si cette technique fabrique un outil, donc exige un fichier vectoriel. */
export function exigeVectoriel(nom) {
  const t = TECHNIQUES[nom];
  // Inconnue : on ne l'autorise pas. Le harnais, lui, refuse carrement la
  // grille qui contiendrait un nom absent de la table.
  if (!t) return true;
  return t.procede === OUTIL;
}

/** Ce qu'il faut fabriquer avant de marquer, quand il faut fabriquer. */
export function outilDe(nom) {
  return TECHNIQUES[nom]?.outil ?? null;
}

/** La technique du referentiel derriere le nom commercial du grossiste. */
export function familleDe(nom) {
  return TECHNIQUES[nom]?.famille ?? null;
}

/**
 * CE QUE LA MATIERE INTERDIT, ET CE QU'ELLE CONDITIONNE.
 *
 * B1 du brief du 20/08, et c'est le controle qui protege la reference. La page
 * a affiche « toute la surface : en sublimation » sur une bouteille en acier
 * inoxydable. La sublimation teint le POLYESTER ou un revetement enduit ; sur
 * metal nu, elle n'existe pas. Une seule affirmation de ce genre, relevee par
 * un professionnel, suffit a tuer la credibilite de tout le site.
 *
 * La donnee source n'avait pas menti : dix-huit references sur soixante-cinq
 * declarent bien une zone de sublimation, ce sont des bouteilles A REVETEMENT
 * sublimable. L'erreur etait de servir ce cas particulier comme s'il valait
 * pour toute la matiere.
 *
 * D'ou deux niveaux, et pas un seul :
 *
 *   `non`          le procede ne peut pas fonctionner sur cette matiere. Le
 *                  couple est ECARTE a la derivation, il n'atteint jamais
 *                  l'ecran ;
 *   `conditionnel` il fonctionne, mais seulement sur une variante du produit.
 *                  Il s'affiche AVEC sa condition, jamais sans.
 *
 * LA TABLE RESTE COURTE ET INDISCUTABLE. Une table trop large est aussi
 * contestable qu'une table absente : on n'y met que ce qu'un atelier
 * confirmerait sans hesiter. Deux mecaniques suffisent a couvrir la classe :
 * la sublimation exige un polyester ou un revetement polymere, la broderie
 * exige un support textile ou l'aiguille passe.
 */
const TEXTILES = new Set(['coton', 'polyester', 'polyester recyclé']);

export function compatibilite(matiere, technique) {
  if (!matiere || !technique) return { etat: 'oui' };
  const famille = familleDe(technique);

  // LA SUBLIMATION teint la fibre polyester, ou le vernis polymere dont on
  // enduit un objet pour la recevoir. Elle ne teint ni le coton, ni le metal,
  // ni le verre, ni le bois.
  if (technique === 'Sublimation') {
    if (matiere === 'polyester' || matiere === 'polyester recyclé') return { etat: 'oui' };
    if (matiere === 'acier inoxydable' || matiere === 'aluminium' || matiere === 'métal'
        || matiere === 'plastique' || matiere === 'céramique') {
      return { etat: 'conditionnel', condition: 'sur les modèles à revêtement sublimable' };
    }
    return { etat: 'non', raison: 'la sublimation teint le polyester, pas cette matière' };
  }

  // LA BRODERIE demande un support ou l'aiguille passe et ou le fil tient.
  if (famille === 'broderie' && !TEXTILES.has(matiere)) {
    return { etat: 'non', raison: 'la broderie demande un support textile' };
  }

  return { etat: 'oui' };
}

/**
 * LE NOM D'UNE TECHNIQUE, AVEC SON ARTICLE.
 *
 * « tampographie s'ouvre aussi » n'est pas une phrase francaise. Le genre ne se
 * devine pas depuis la chaine : « transfert » est masculin, « sérigraphie »
 * feminine, « impression » commence par une voyelle. La table le sait.
 */
const GENRES = Object.freeze({
  'Sérigraphie': 'la', 'Sérigraphie circulaire': 'la', 'Tampographie': 'la',
  'Gravure laser': 'la', 'Gravure laser 360': 'la', 'Broderie': 'la',
  'Sublimation': 'la', 'Impression numérique': "l'", 'Impression numérique 360': "l'",
  'Étiquette numérique': "l'", 'Embossage': "l'",
  'Transfert numérique': 'le', 'Transfert sérigraphique': 'le',
  'Transfert réfléchissant': 'le', 'Doming': 'le', 'Marquage à chaud': 'le',
});

export function avecArticle(nom) {
  const article = GENRES[nom];
  const minuscule = String(nom).toLowerCase();
  if (!article) return minuscule;
  return article === "l'" ? `l'${minuscule}` : `${article} ${minuscule}`;
}

/** Toute technique citee est-elle classee ? Sert au harnais, et a lui seul. */
export function techniquesInconnues(noms) {
  return [...new Set(noms)].filter((n) => !TECHNIQUES[n]);
}

/**
 * LA DEFINITION SUFFISANTE, et pourquoi elle entre ici.
 *
 * « Accepte un raster » ne veut pas dire « accepte n'importe quelle image ».
 * Dire oui a un logo de 200 pixels de large sur une zone de 300 mm serait
 * l'erreur symetrique de celle qu'on corrige : une porte ouverte a tort.
 *
 * Les deux valeurs viennent du corpus, fiche 06, section resolution : dix-huit
 * sources convergent sur 300 dpi a la taille finale, et le seul rang 1 de la
 * section (Transfer Express, UltraColor Max) publie les DEUX bornes, « 150 dpi
 * accepte, 300 dpi recommande ». On garde les deux, on n'en fait pas une
 * moyenne : le plancher decide, le recommande se dit.
 *
 * SOURCÉ. Ce n'est pas un seuil de finesse de trait, ces valeurs ne sont pas
 * bloquees par P0.7 : il n'y a pas ici de nuage de vingt-trois valeurs a
 * reduire, il y a une convergence et un plancher publie par le fabricant.
 */
export const DPI_RECOMMANDE = 300;
export const DPI_PLANCHER = 150;

/**
 * Combien de points par pouce cette image offrirait-elle, imprimee a cette
 * largeur ? Fait mesurable, aucun jugement.
 */
export function dpiALaTaille(largeurPx, largeurMm) {
  if (!Number.isFinite(largeurPx) || !Number.isFinite(largeurMm) || largeurMm <= 0) return null;
  return (largeurPx / largeurMm) * 25.4;
}

/** `bonne`, `juste` ou `insuffisante`. Null si on ne sait pas mesurer. */
export function qualifierDefinition(largeurPx, largeurMm) {
  const dpi = dpiALaTaille(largeurPx, largeurMm);
  if (dpi === null) return null;
  if (dpi >= DPI_RECOMMANDE) return 'bonne';
  if (dpi >= DPI_PLANCHER) return 'juste';
  return 'insuffisante';
}
