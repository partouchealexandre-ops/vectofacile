/**
 * LE SIMULATEUR : poser un logo dans une zone declaree, et MESURER.
 *
 * Ce module ne dessine rien et ne connait aucun produit. Il recoit un lot
 * derive et une image, il rend des millimetres. Le dessin vit dans
 * `rendu_simulation.js`, qui restitue son bitmap a l'appelant.
 *
 * TROIS REGLES D'ARCHITECTURE, et chacune a ete payee une fois :
 *
 *   AUCUNE LISTE EN DUR. Ni produit, ni zone, ni technique. Un lot nouveau
 *   doit fonctionner sans qu'on touche a ce fichier.
 *
 *   LE MILLIMETRE EST LA VERITE, le pixel n'en est qu'une approximation. Sur
 *   une bande de 5 mm qui tient sur dix-sept pixels, le rectangle declare
 *   s'ecarte de 3 % du rapport declare en millimetres. On calcule donc en
 *   millimetres et on ne descend en pixels que pour dessiner.
 *
 *   LE PLAFOND DE COULEURS APPARTIENT A LA POSITION. Jamais au nom de la
 *   technique, jamais a son identifiant. Mesure sur le catalogue complet :
 *   18 identifiants sur 49 portent un plafond qui varie selon la position,
 *   soit 50,6 % des 20 064 couples position-technique. Sur le lot 1, `S3`
 *   vaut 4 couleurs en haut du carnet et 1 en bas, sur le meme produit.
 */

/**
 * LA QUADRICHROMIE S'ECRIT null, JAMAIS 0.
 *
 * La source code la quadri par 0. La traduction se fait UNE FOIS, a la
 * derivation, exactement comme pour les archetypes. Si un 0 arrive jusqu'ici,
 * c'est qu'un second chemin a contourne la derivation, et le silence serait
 * la pire des reponses : `accepte()` calculerait `3 <= 0`, donc faux, et la
 * technique la plus permissive deviendrait la plus fermee. Un logo
 * parfaitement marquable s'entendrait dire non.
 */
export function verifierLotDerive(lot) {
  const fautes = [];
  for (const vue of lot?.vues ?? []) {
    for (const t of vue.techniques ?? []) {
      if (t.couleursMax === 0) {
        fautes.push(`${vue.produit} ${vue.zone} ${t.id} porte 0 au lieu de null`);
      }
      if (t.couleursMax !== null && !Number.isInteger(t.couleursMax)) {
        fautes.push(`${vue.produit} ${vue.zone} ${t.id} porte ${t.couleursMax}`);
      }
      if (!t.id) fautes.push(`${vue.produit} ${vue.zone} : technique sans identifiant`);
    }
  }
  return fautes;
}

/** Les objets du lot, dans l'ordre ou ils s'y trouvent. */
export function produits(lot) {
  const vus = new Map();
  for (const v of lot?.vues ?? []) {
    if (!vus.has(v.produit)) vus.set(v.produit, { id: v.produit, objet: v.objet, matiere: v.matiere });
  }
  return [...vus.values()];
}

/** Les vues d'un objet. */
export function vuesDuProduit(lot, produit) {
  return (lot?.vues ?? []).filter((v) => v.produit === produit);
}

/**
 * L'ECHELLE DE L'APERCU, LUE SUR LA PLUS GRANDE DIMENSION DE LA ZONE.
 *
 * C'est elle qui porte le plus de pixels, donc le moins d'arrondi. Choisir la
 * petite se paye jusqu'a 3 % sur les bandes fines du lot 1.
 */
export function echelleMmParPixel(vue) {
  const { largeur, hauteur } = vue.zonePx;
  if (!(largeur > 0) || !(hauteur > 0)) return null;
  return largeur >= hauteur ? vue.largeurMm / largeur : vue.hauteurMm / hauteur;
}

/**
 * POSER LE LOGO, CENTRE ET CONTENU.
 *
 * `part` est la fraction de la LARGEUR de zone occupee, entre 0 et 1. La
 * position n'est pas un reglage : le fabricant l'impose. La taille, si : c'est
 * la seule variable qui deplace le diagnostic, et elle doit ressortir d'ici
 * comme une donnee, pas rester un etat d'interface.
 *
 * `logo` porte `largeurPx`, `hauteurPx`, et facultativement `traitPx`,
 * l'epaisseur du trait le plus fin mesuree sur l'image a sa taille native.
 */
export function poserLogo({ vue, logo, part }) {
  const mmParPx = echelleMmParPixel(vue);
  if (!mmParPx || !logo?.largeurPx || !logo?.hauteurPx) return null;
  const p = Math.min(1, Math.max(0, Number(part)));
  const rapport = logo.largeurPx / logo.hauteurPx;

  // Tout se decide en millimetres.
  let largeurMm = vue.largeurMm * p;
  let hauteurMm = largeurMm / rapport;
  let borneParHauteur = false;
  if (hauteurMm > vue.hauteurMm) {
    hauteurMm = vue.hauteurMm;
    largeurMm = hauteurMm * rapport;
    borneParHauteur = true;
  }

  // On ne descend en pixels que pour dessiner, et on reste dans le cadre :
  // un marquage hors zone n'existe pas.
  const largeurPx = Math.min(largeurMm / mmParPx, vue.zonePx.largeur);
  const hauteurPx = Math.min(hauteurMm / mmParPx, vue.zonePx.hauteur);

  return {
    largeurMm,
    hauteurMm,
    borneParHauteur,
    mmParPixelApercu: mmParPx,
    traitMm: Number.isFinite(logo.traitPx) && logo.traitPx > 0
      ? logo.traitPx * (largeurMm / logo.largeurPx) : null,
    boite: {
      x: vue.zonePx.x + (vue.zonePx.largeur - largeurPx) / 2,
      y: vue.zonePx.y + (vue.zonePx.hauteur - hauteurPx) / 2,
      largeur: largeurPx,
      hauteur: hauteurPx,
    },
  };
}

/**
 * LES PLAFONDS DE LA POSITION, jamais un chiffre agrege.
 *
 * Une carte de technique ne peut pas afficher un plafond unique : elle affiche
 * celui de la position choisie, ou la fourchette rencontree. Un agregat
 * n'existe nulle part et se lirait comme une promesse.
 */
export function plafondsDe(vue) {
  const techniques = vue?.techniques ?? [];
  const chiffres = techniques.map((t) => t.couleursMax).filter((n) => Number.isInteger(n));
  return {
    parTechnique: techniques.map((t) => ({ id: t.id, nom: t.nom, couleursMax: t.couleursMax })),
    quadriDisponible: techniques.some((t) => t.couleursMax === null),
    minimum: chiffres.length ? Math.min(...chiffres) : null,
    maximum: chiffres.length ? Math.max(...chiffres) : null,
  };
}

/** Cette position accepte-t-elle ce nombre de couleurs, et par quoi ? */
export function techniquesQuiAcceptent(vue, nCouleurs) {
  return (vue?.techniques ?? []).filter((t) => {
    if (t.couleursMax === null) return true;            // quadrichromie
    if (!Number.isInteger(nCouleurs) || nCouleurs <= 0) return true;
    return nCouleurs <= t.couleursMax;
  });
}

/**
 * LE CONTRASTE DU LOGO SUR SON SUPPORT.
 *
 * Septieme cause de refus, et d'une autre nature que les six premieres :
 * celles-la portent sur le fichier seul, celle-ci n'existe qu'une fois le
 * produit choisi. Le moteur de mesure du logo ne connait pas le produit, donc
 * ce calcul ne peut pas vivre chez lui. Le diagnostic a deux etages.
 *
 * Instrument : luminance relative WCAG 2.1, rapport de 1 a 21. Le rapport est
 * un FAIT ; ce qu'on en dit au visiteur est un arbitrage, et il vit dans le
 * rendu, pas ici.
 */
export function luminanceRelative(r, g, b) {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function rapportDeContraste(luminanceA, luminanceB) {
  if (!Number.isFinite(luminanceA) || !Number.isFinite(luminanceB)) return null;
  const haut = Math.max(luminanceA, luminanceB);
  const bas = Math.min(luminanceA, luminanceB);
  return (haut + 0.05) / (bas + 0.05);
}

/**
 * CE QUE LE MODULE RENVOIE A L'APPELANT.
 *
 * La taille choisie voyage. Si le visiteur regle son logo a 210 mm et qu'on
 * jette cette valeur, on lui a fait prendre la seule decision du parcours pour
 * la perdre en route.
 */
export function restituer({ vue, pose, contraste = null }) {
  if (!vue) return null;
  const plafonds = plafondsDe(vue);
  return {
    produit: vue.produit,
    objet: vue.objet,
    matiere: vue.matiere,
    zone: vue.zone,
    zonesSource: vue.zonesSource,
    zoneMm: { largeur: vue.largeurMm, hauteur: vue.hauteurMm },
    marquageMm: pose ? { largeur: pose.largeurMm, hauteur: pose.hauteurMm } : null,
    traitLePlusFinMm: pose?.traitMm ?? null,
    mmParPixelApercu: pose?.mmParPixelApercu ?? echelleMmParPixel(vue),
    contrasteSurSupport: contraste,
    techniques: plafonds.parTechnique,
    plafondUnique: null,   // il n'existe pas. La fourchette, oui.
    plafondFourchette: { minimum: plafonds.minimum, maximum: plafonds.maximum,
                         quadriDisponible: plafonds.quadriDisponible },
  };
}
