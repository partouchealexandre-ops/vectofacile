/**
 * Couleurs : conversion sRGB vers CIE Lab, ecart perceptuel, et regroupement
 * des couleurs brutes en couleurs reelles.
 *
 * Le probleme metier : un logo enregistre en JPEG contient couramment 20 000 a
 * 60 000 couleurs distinctes alors que le graphiste en a dessine six. Les
 * fabricants de goodies, eux, comptent les six. Tout le diagnostic couleur
 * repose sur la difference entre ces deux nombres.
 *
 * Les deux constantes de reglage ci-dessous sont des parametres d'INSTRUMENT,
 * pas des seuils de marquage. Elles ne sortent pas d'une source metier et ne
 * doivent jamais etre confondues avec une valeur du referentiel : elles disent
 * comment on mesure, pas ce qui est marquable. Elles sont calees sur le corpus
 * synthetique, ou la verite terrain est connue par construction.
 */

/** Ecart Lab en dessous duquel deux teintes sont la meme aux yeux du marquage. */
export const ECART_FUSION = 9;

/** Part minimale de l'encre pour qu'une teinte compte comme couleur reelle. */
export const COUVERTURE_MINIMALE = 0.004;

function versLineaire(canal) {
  const c = canal / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function f(t) {
  return t > 0.008856451679035631 ? Math.cbrt(t) : t / 0.12841854934601665 + 4 / 29;
}

/** sRGB 0..255 vers CIE Lab, illuminant D65, observateur 2 degres. */
export function versLab(r, v, b) {
  const rl = versLineaire(r);
  const vl = versLineaire(v);
  const bl = versLineaire(b);
  const X = (0.4124564 * rl + 0.3575761 * vl + 0.1804375 * bl) / 0.95047;
  const Y = (0.2126729 * rl + 0.7151522 * vl + 0.0721750 * bl) / 1.0;
  const Z = (0.0193339 * rl + 0.1191920 * vl + 0.9503041 * bl) / 1.08883;
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Ecart CIE76. Suffisant ici : on separe des aplats, on ne calibre pas un ecran. */
export function ecartLab(a, b) {
  const dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Histogramme exact des couleurs RVB sur un sous ensemble de pixels.
 * @returns {Map<number, number>} cle 0xRRVVBB, valeur nombre de pixels
 */
export function histogramme(donnees, selection) {
  const compte = new Map();
  const n = selection.length;
  for (let i = 0; i < n; i++) {
    if (!selection[i]) continue;
    const p = i * 4;
    const cle = (donnees[p] << 16) | (donnees[p + 1] << 8) | donnees[p + 2];
    compte.set(cle, (compte.get(cle) || 0) + 1);
  }
  return compte;
}

/**
 * Regroupe les couleurs brutes en couleurs reelles.
 *
 * Methode, voulue deterministe et explicable a un client :
 *   1. on trie les teintes par nombre de pixels decroissant ;
 *   2. la plus presente ouvre un groupe ; chaque teinte suivante rejoint le
 *      premier groupe dont le centre est a moins de ECART_FUSION, sinon elle
 *      ouvre le sien ;
 *   3. les groupes qui ne couvrent pas COUVERTURE_MINIMALE de l'encre sont
 *      ecartes : ce sont les bavures de compression et l'antialiasing, pas des
 *      couleurs voulues. Leur poids total est rendu a part, c'est lui qui sert
 *      a mesurer la salissure du fichier.
 *
 * Le tri par presence decroissante n'est pas cosmetique : il garantit que les
 * aplats voulus ouvrent les groupes avant les melanges de bord, sinon une
 * chaine de teintes intermediaires fusionnerait deux aplats distincts.
 */
export function regrouperCouleurs(compte, options = {}) {
  const ecartFusion = options.ecartFusion ?? ECART_FUSION;
  const couvertureMin = options.couvertureMinimale ?? COUVERTURE_MINIMALE;

  let total = 0;
  const entrees = [];
  for (const [cle, n] of compte) {
    total += n;
    entrees.push([cle, n]);
  }
  if (total === 0) {
    return { couleursReelles: [], couleursBrutes: 0, pixelsEcartes: 0, pixelsTotal: 0 };
  }

  entrees.sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]));

  const groupes = [];
  for (const [cle, n] of entrees) {
    const r = (cle >> 16) & 255, v = (cle >> 8) & 255, b = cle & 255;
    const lab = versLab(r, v, b);
    let cible = null;
    for (const g of groupes) {
      if (ecartLab(lab, g.lab) < ecartFusion) { cible = g; break; }
    }
    if (cible) {
      cible.pixels += n;
      cible.membres++;
    } else {
      groupes.push({ rvb: [r, v, b], lab, pixels: n, membres: 1 });
    }
  }

  const seuil = couvertureMin * total;
  const retenues = groupes.filter((g) => g.pixels >= seuil);
  const ecartes = groupes.filter((g) => g.pixels < seuil);
  const pixelsEcartes = ecartes.reduce((s, g) => s + g.pixels, 0);

  retenues.sort((a, b) => b.pixels - a.pixels);

  return {
    couleursReelles: retenues.map((g) => ({
      rvb: g.rvb,
      lab: g.lab,
      pixels: g.pixels,
      part: g.pixels / total,
    })),
    couleursBrutes: compte.size,
    pixelsEcartes,
    pixelsTotal: total,
  };
}

/** Index de la couleur reelle la plus proche, ou -1 si aucune sous le seuil. */
export function couleurLaPlusProche(lab, couleursReelles, ecartMax) {
  let meilleur = -1;
  let meilleureDistance = Infinity;
  for (let i = 0; i < couleursReelles.length; i++) {
    const d = ecartLab(lab, couleursReelles[i].lab);
    if (d < meilleureDistance) { meilleureDistance = d; meilleur = i; }
  }
  if (ecartMax !== undefined && meilleureDistance > ecartMax) return -1;
  return meilleur;
}

/**
 * Cache de conversion Lab, indexe par la valeur RVB.
 * Un JPEG de logo porte 20 000 a 60 000 teintes distinctes pour des millions
 * de pixels : convertir chaque pixel serait dix a cent fois le travail utile.
 * Le cache rend le moteur utilisable sur une image de 4000 pixels de large
 * dans un navigateur de telephone, ce qui est le cas d'usage reel.
 */
export function creerCacheLab() {
  const cache = new Map();
  return function lab(r, v, b) {
    const cle = (r << 16) | (v << 8) | b;
    let valeur = cache.get(cle);
    if (valeur === undefined) {
      valeur = versLab(r, v, b);
      cache.set(cle, valeur);
    }
    return valeur;
  };
}
