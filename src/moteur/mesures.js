/**
 * Moteur de mesure M1 a M10 de la spec produit.
 *
 * Regle d'architecture, posee au §6 de la spec : ce fichier est une fonction
 * pure. Il ne connait ni le DOM, ni un fichier, ni un objet a marquer, ni un
 * seuil. Il MESURE. Il ne juge pas. Le passage de la mesure au verdict se fait
 * ailleurs, contre seuils.json, et seuils.json ne contient que des valeurs en
 * contexte objet a l'etat source ou arbitre.
 *
 * Cette separation n'est pas de la coquetterie : elle est ce qui permet de
 * changer un seuil arbitre par Alex sans retoucher une ligne de mesure, et de
 * rejouer tout le corpus contre l'ancien et le nouveau seuil pour voir ce qui
 * bascule.
 *
 * Convention d'encadrement. La transformee de distance travaille de centre de
 * pixel a centre de pixel. Une epaisseur impaire tombe juste, une epaisseur
 * paire tombe entre deux valeurs. Le moteur rend donc { basse, haute } et
 * jamais un nombre unique invente. Le verdict prendra la borne basse, qui est
 * la prudente : on annonce un trait plus fin que la realite, donc un risque
 * plutot qu'une fausse promesse.
 */

import {
  detecterFond, masqueEncre, nettoyerSalissures, boiteEnglobante,
  fondExterieur, composantesConnexes, masqueStable, boucherTrous, aireMinimalePour,
} from './image.js';
import {
  histogramme, regrouperCouleurs, ecartLab, creerCacheLab, ECART_FUSION,
} from './couleurs.js';
import { transformeeDistance, pointsDeCrete, cotesOpposes } from './distance.js';

/** Un pixel d'encre a plus de cette distance d'un bord est un pixel d'interieur. */
const MARGE_INTERIEUR = 2;

/** Angle minimal entre deux directions d'encre pour parler d'un ecart, en degres. */
const ANGLE_OPPOSITION = 120;

/**
 * Longueur minimale d'une crete, en points, pour qu'elle compte comme un trait.
 *
 * Une crete de un ou deux points n'est pas un trait, c'est un accident : un
 * pixel de compression, un angle, une bavure. Un vrai filet, meme court, en
 * aligne davantage. Sans ce plancher, la mesure du trait le plus fin d'un
 * JPEG de logo rend systematiquement 1 px, et le diagnostic devient inutile
 * exactement sur les fichiers pour lesquels le produit existe.
 */
const LONGUEUR_MINIMALE_CRETE = 3;

/** Regroupe des points de crete en composantes connexes de cretes. */
function grouperCretes(indices, largeur, hauteur) {
  const dans = new Set(indices);
  const vus = new Set();
  const groupes = [];
  for (const depart of indices) {
    if (vus.has(depart)) continue;
    const pile = [depart];
    vus.add(depart);
    const membres = [];
    while (pile.length) {
      const i = pile.pop();
      membres.push(i);
      const x = i % largeur, y = (i / largeur) | 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= largeur || yy >= hauteur) continue;
          const j = yy * largeur + xx;
          if (dans.has(j) && !vus.has(j)) { vus.add(j); pile.push(j); }
        }
      }
    }
    groupes.push(membres);
  }
  return groupes;
}

function encadrementDepuisDistance(d) {
  if (d === null || !Number.isFinite(d)) return null;
  return { basse: 2 * d - 1, haute: 2 * d };
}

/** Conversion pixel vers millimetre, connaissant la largeur d'impression visee. */
export function pxVersMm(px, largeurImagePx, largeurImprimeeMm) {
  if (!largeurImagePx || !largeurImprimeeMm) return null;
  return (px * largeurImprimeeMm) / largeurImagePx;
}

export function encadrementEnMm(encadrement, largeurImagePx, largeurImprimeeMm) {
  if (!encadrement) return null;
  const basse = pxVersMm(encadrement.basse, largeurImagePx, largeurImprimeeMm);
  const haute = pxVersMm(encadrement.haute, largeurImagePx, largeurImprimeeMm);
  if (basse === null) return null;
  return { basse, haute };
}

/* ------------------------------------------------------------------ M1 */

export function m1Dimensions(image) {
  return {
    largeurPx: image.largeur,
    hauteurPx: image.hauteur,
    pixels: image.largeur * image.hauteur,
    rapport: image.hauteur ? image.largeur / image.hauteur : null,
  };
}

/* ------------------------------------------------------------------ M2 */

export function m2Couleurs(image, masque, stable, options) {
  // On ne compte que les pixels PLEINEMENT OPAQUES, et il y a deux raisons.
  //
  // Metier : la teinte d'un pixel a moitie transparent n'est une couleur voulue
  // par personne, c'est un bord adouci. Un marqueur ne la verra jamais.
  //
  // Technique, decouverte par le harnais de bout en bout le 18/08 : un canvas
  // de navigateur stocke les pixels en alpha premultiplie et arrondit en les
  // rendant. Le meme PNG comptait une couleur brute lu en fichier et deux lu
  // par un navigateur. Les deux moities du produit ne disaient plus la meme
  // chose sur le meme fichier.
  const opaque = new Uint8Array(masque.length);
  const stableOpaque = new Uint8Array(masque.length);
  let opaques = 0;
  for (let i = 0; i < masque.length; i++) {
    const plein = image.donnees[i * 4 + 3] >= 250;
    opaque[i] = masque[i] && plein ? 1 : 0;
    stableOpaque[i] = stable[i] && plein ? 1 : 0;
    opaques += opaque[i];
  }
  const selection = opaques > 0 ? opaque : masque;
  const selectionStable = opaques > 0 ? stableOpaque : stable;

  const brutes = histogramme(image.donnees, selection);
  const stables = histogramme(image.donnees, selectionStable);
  // La palette se decide sur les pixels stables, jamais sur les rampes de
  // compression. Le nombre de couleurs brutes, lui, se compte sur toute
  // l'encre : c'est le nombre que le client voit dans son logiciel.
  const g = regrouperCouleurs(stables.size ? stables : brutes, options);
  return {
    couleursBrutes: brutes.size,
    couleursReelles: g.couleursReelles.length,
    palette: g.couleursReelles.map((c) => ({
      rvb: c.rvb,
      hex: '#' + c.rvb.map((v) => v.toString(16).padStart(2, '0')).join(''),
      part: c.part,
      pixels: c.pixels,
    })),
    pixelsHorsPalette: g.pixelsEcartes,
    pixelsStables: stables.size ? Array.from(stables.values()).reduce((a, b) => a + b, 0) : 0,
    pixelsEncre: Array.from(brutes.values()).reduce((a, b) => a + b, 0),
    _interne: g.couleursReelles,
  };
}

/* ------------------------------------------------------- M3, M4 et M10 */

/**
 * Purete des pixels : un pixel est impur s'il n'est ni le fond, ni assez
 * proche d'une couleur reelle retenue. Cette seule passe alimente trois
 * mesures : le halo (M3), le soupcon de degrade (M4) et l'heuristique
 * d'export (M10). Elles ne different que par l'endroit ou l'on regarde.
 */
export function analyserPurete(image, masque, fond, palette, boite, distanceEncre, lab) {
  const { largeur, donnees } = image;
  const labFond = fond.type === 'couleur'
    ? lab(fond.rvb[0], fond.rvb[1], fond.rvb[2])
    : null;

  let impursBoite = 0, pixelsBoite = 0;
  let impursInterieur = 0, pixelsInterieur = 0;
  let impursBord = 0;

  if (!boite) {
    return {
      halo: { partBoite: 0, pixelsImpurs: 0, pixelsBoite: 0 },
      degrade: { partInterieurImpur: 0, pixelsInterieur: 0 },
      repartition: { bord: 0, interieur: 0 },
    };
  }

  for (let y = boite.yMin; y <= boite.yMax; y++) {
    for (let x = boite.xMin; x <= boite.xMax; x++) {
      const i = y * largeur + x;
      const p = i * 4;
      pixelsBoite++;
      const alpha = donnees[p + 3];
      const teinte = lab(donnees[p], donnees[p + 1], donnees[p + 2]);

      let pur = false;
      if (fond.type === 'transparent' && alpha === 0) pur = true;
      else if (labFond && ecartLab(teinte, labFond) <= ECART_FUSION) pur = true;
      else {
        for (const c of palette) {
          if (ecartLab(teinte, c.lab) <= ECART_FUSION) { pur = true; break; }
        }
      }
      if (fond.type === 'transparent' && alpha > 0 && alpha < 255) pur = false;

      const dedans = masque[i] === 1;
      if (dedans) {
        const loinDuBord = distanceEncre[i] > MARGE_INTERIEUR;
        if (loinDuBord) {
          pixelsInterieur++;
          if (!pur) impursInterieur++;
        } else if (!pur) impursBord++;
      } else if (!pur) {
        impursBord++;
      }
      if (!pur) impursBoite++;
    }
  }

  return {
    halo: {
      partBoite: pixelsBoite ? impursBoite / pixelsBoite : 0,
      pixelsImpurs: impursBoite,
      pixelsBoite,
    },
    degrade: {
      partInterieurImpur: pixelsInterieur ? impursInterieur / pixelsInterieur : 0,
      pixelsInterieur,
      pixelsImpursInterieur: impursInterieur,
    },
    repartition: { bord: impursBord, interieur: impursInterieur },
  };
}

export function m4Transparence(image) {
  const { donnees } = image;
  let partiels = 0, totalementTransparents = 0;
  const n = donnees.length / 4;
  for (let i = 0; i < n; i++) {
    const a = donnees[i * 4 + 3];
    if (a === 0) totalementTransparents++;
    else if (a < 255) partiels++;
  }
  return {
    aTransparencePartielle: partiels > 0,
    pixelsSemiTransparents: partiels,
    partSemiTransparents: n ? partiels / n : 0,
    pixelsTransparents: totalementTransparents,
  };
}

/* ------------------------------------------------------------------ M5 */

export function m5TraitLePlusFin(masque, largeur, hauteur) {
  const fond = new Uint8Array(masque.length);
  for (let i = 0; i < masque.length; i++) fond[i] = masque[i] ? 0 : 1;
  const distance = transformeeDistance(fond, largeur, hauteur);
  const cretes = pointsDeCrete(distance, masque, largeur, hauteur);

  // On ne garde que les cretes ou le disque inscrit touche le fond de deux
  // cotes opposes. Voir cotesOpposes dans distance.js : sans ce filtre, les
  // branches d'axe median qui rejoignent les angles feraient passer tout aplat
  // a coin pour un trait de deux ou trois pixels.
  const opposees = cretes.filter((i) => cotesOpposes(i, distance[i] + 1, fond, largeur, hauteur));

  // Un trait, c'est une crete qui COURT. Voir LONGUEUR_MINIMALE_CRETE.
  let min = null;
  let retenues = 0;
  for (const groupe of grouperCretes(opposees, largeur, hauteur)) {
    if (groupe.length < LONGUEUR_MINIMALE_CRETE) continue;
    retenues += groupe.length;
    for (const i of groupe) {
      if (min === null || distance[i] < min) min = distance[i];
    }
  }

  return {
    encadrementPx: encadrementDepuisDistance(min),
    cretesTotal: cretes.length,
    cretesRetenues: retenues,
    distanceEncre: distance,
    cretes,
  };
}

/* ------------------------------------------------------------------ M6 */

/**
 * Un point de crete du fond est dans un ECART s'il a de l'encre de deux cotes
 * franchement opposes. Sans ce test, le point le plus etroit du fond exterieur,
 * pres d'un coin de la boite, ferait passer pour un ecart ce qui n'est que le
 * vide autour du logo.
 */
export function m6ContreFormesEtEcarts(masque, largeur, hauteur, boite) {
  const fondMasque = new Uint8Array(masque.length);
  for (let i = 0; i < masque.length; i++) fondMasque[i] = masque[i] ? 0 : 1;

  const distanceFond = transformeeDistance(masque, largeur, hauteur);
  const cretes = pointsDeCrete(distanceFond, fondMasque, largeur, hauteur);
  const exterieur = fondExterieur(masque, largeur, hauteur);

  // Contre formes : composantes de fond non joignables depuis le bord.
  const ferme = new Uint8Array(masque.length);
  for (let i = 0; i < masque.length; i++) ferme[i] = (!masque[i] && !exterieur[i]) ? 1 : 0;
  const { etiquettes, composantes } = composantesConnexes(ferme, largeur, hauteur);
  const rayonParComposante = new Map();
  for (let i = 0; i < ferme.length; i++) {
    if (!ferme[i]) continue;
    const id = etiquettes[i];
    const d = distanceFond[i];
    if (!rayonParComposante.has(id) || d > rayonParComposante.get(id)) {
      rayonParComposante.set(id, d);
    }
  }
  let plusPetiteContreForme = null;
  let nombreContreFormes = 0;
  for (const c of composantes) {
    if (c.aire < 2) continue;
    nombreContreFormes++;
    const r = rayonParComposante.get(c.id);
    if (plusPetiteContreForme === null || r < plusPetiteContreForme) plusPetiteContreForme = r;
  }

  // Ecarts : cretes du fond situees dans la boite de l'encre et encadrees
  // par de l'encre de deux cotes opposes.
  let ecartMin = null;
  if (boite) {
    const candidats = cretes.filter((i) => {
      const x = i % largeur, y = (i / largeur) | 0;
      if (x < boite.xMin || x > boite.xMax || y < boite.yMin || y > boite.yMax) return false;
      return cotesOpposes(i, distanceFond[i] + 1, masque, largeur, hauteur, ANGLE_OPPOSITION);
    });
    for (const groupe of grouperCretes(candidats, largeur, hauteur)) {
      if (groupe.length < LONGUEUR_MINIMALE_CRETE) continue;
      for (const i of groupe) {
        if (ecartMin === null || distanceFond[i] < ecartMin) ecartMin = distanceFond[i];
      }
    }
  }

  return {
    plusPetiteContreFormePx: encadrementDepuisDistance(plusPetiteContreForme),
    nombreContreFormes,
    ecartMinimalPx: encadrementDepuisDistance(ecartMin),
  };
}

/* ------------------------------------------------------------------ M7 */

/**
 * Hauteur de capitale. On ne fait pas de reconnaissance de caracteres : on
 * cherche des composantes de taille comparable alignees sur une meme ligne de
 * pied. Si le faisceau d'indices est faible, on rend null, et l'interface
 * affichera "non mesuree". Une hauteur de texte inventee deviendrait un feu
 * vert ou rouge injustifie : c'est exactement le genre de valeur inferee que
 * la doctrine interdit de servir.
 */
export function m7HauteurDeCapitale(composantes, boite) {
  if (!boite || composantes.length < 3) return { hauteurPx: null, motif: 'trop peu de composantes' };

  const aireBoite = boite.largeur * boite.hauteur;
  const candidats = composantes.filter((c) => {
    const h = c.yMax - c.yMin + 1;
    const l = c.xMax - c.xMin + 1;
    return c.aire >= 8 && c.aire <= 0.2 * aireBoite && h >= 4 && l <= 4 * h;
  });
  if (candidats.length < 3) return { hauteurPx: null, motif: 'trop peu de candidats glyphes' };

  const groupes = [];
  for (const c of candidats) {
    const pied = c.yMax;
    const hauteur = c.yMax - c.yMin + 1;
    const tolerance = Math.max(2, 0.12 * hauteur);
    let cible = groupes.find((g) => Math.abs(g.pied - pied) <= tolerance);
    if (!cible) { cible = { pied, membres: [] }; groupes.push(cible); }
    cible.membres.push(c);
    cible.pied = cible.membres.reduce((s, m) => s + m.yMax, 0) / cible.membres.length;
  }

  const retenus = groupes.filter((g) => g.membres.length >= 3);
  if (retenus.length === 0) return { hauteurPx: null, motif: 'aucune ligne de pied commune' };

  retenus.sort((a, b) => b.membres.length - a.membres.length);
  const ligne = retenus[0];
  const hauteurs = ligne.membres.map((m) => m.yMax - m.yMin + 1).sort((a, b) => a - b);
  const hMax = hauteurs[hauteurs.length - 1];
  const capitales = hauteurs.filter((h) => h >= 0.75 * hMax);
  if (capitales.length < 2) return { hauteurPx: null, motif: 'hauteurs trop dispersees' };
  const mediane = capitales[Math.floor(capitales.length / 2)];
  const dispersion = (capitales[capitales.length - 1] - capitales[0]) / mediane;
  if (dispersion > 0.2) return { hauteurPx: null, motif: 'hauteurs trop dispersees' };

  return {
    hauteurPx: mediane,
    glyphesRetenus: capitales.length,
    lignesDetectees: retenus.length,
    motif: null,
  };
}

/* ------------------------------------------------------------------ M8 */

/**
 * Plus grand aplat d'une seule couleur. C'est la mesure qui commande le
 * marquage a chaud, la seule technique du referentiel ou le grand aplat est
 * plus difficile que le trait fin.
 */
export function m8PlusGrandAplat(image, masque, palette, largeur, hauteur, lab) {
  if (palette.length === 0) return { airePx: 0, indexCouleur: null };
  const { donnees } = image;
  const affectation = new Int32Array(masque.length).fill(-1);
  for (let i = 0; i < masque.length; i++) {
    if (!masque[i]) continue;
    const p = i * 4;
    const teinte = lab(donnees[p], donnees[p + 1], donnees[p + 2]);
    let meilleur = -1, meilleureDistance = Infinity;
    for (let k = 0; k < palette.length; k++) {
      const d = ecartLab(teinte, palette[k].lab);
      if (d < meilleureDistance) { meilleureDistance = d; meilleur = k; }
    }
    affectation[i] = meilleur;
  }

  let resultat = { airePx: 0, indexCouleur: null, boite: null };
  for (let k = 0; k < palette.length; k++) {
    const zone = new Uint8Array(masque.length);
    for (let i = 0; i < masque.length; i++) zone[i] = affectation[i] === k ? 1 : 0;
    const { composantes } = composantesConnexes(zone, largeur, hauteur);
    for (const c of composantes) {
      if (c.aire > resultat.airePx) {
        resultat = {
          airePx: c.aire,
          indexCouleur: k,
          rvb: palette[k].rvb,
          boite: { xMin: c.xMin, xMax: c.xMax, yMin: c.yMin, yMax: c.yMax },
        };
      }
    }
  }
  return resultat;
}

/* ------------------------------------------------------------------ M9 */

/**
 * Taille maximale imprimable. Le moteur ne connait pas la resolution cible :
 * c'est un seuil, il vit dans seuils.json et depend de la technique. Le moteur
 * rend donc la fonction, pas la reponse.
 */
export function m9TailleMaximaleMm(largeurPx, hauteurPx, dpiCible) {
  if (!dpiCible) return null;
  const mmParPouce = 25.4;
  return {
    largeurMm: (largeurPx / dpiCible) * mmParPouce,
    hauteurMm: (hauteurPx / dpiCible) * mmParPouce,
    dpiCible,
  };
}

/* ----------------------------------------------------------------- M10 */

/** Distance a laquelle on cherche un mouvement de teinte, en pixels. */
const PORTEE_VARIATION = 24;
/** Pas d'echantillonnage le long du trajet. */
const PAS_VARIATION = 4;
/** Mouvement total juge significatif sur la portee. */
const SEUIL_VARIATION = 6;
/** Au dela de ce saut sur un seul pas, ce n'est plus une rampe, c'est une frontiere. */
const SEUIL_MARCHE = 3;

/**
 * Variation interne : part des pixels d'INTERIEUR traverses par une RAMPE de
 * teinte, c'est a dire un degrade, un flou ou une photo.
 *
 * Deux pieges ont ete rencontres en ecrivant cette mesure, et les deux sont
 * dans le corpus synthetique :
 *
 * 1. Un degrade est localement plat, c'est sa definition. Le filtre de
 *    stabilite qui sert a compter les couleurs ne le voit donc pas du tout. Il
 *    faut regarder loin, pas a un pixel : la portee est de 24 px.
 *
 * 2. Regarder loin ne suffit pas. A 24 px, la frontiere entre deux aplats
 *    francs bouge autant qu'un degrade. Ce qui les separe n'est pas l'amplitude
 *    du mouvement, c'est sa FORME : une rampe monte par petites marches, une
 *    frontiere monte d'un coup. On echantillonne donc le trajet, et un seul
 *    saut superieur a SEUIL_MARCHE disqualifie le trajet.
 *
 * Sans le point 2, neuf aplats francs cote a cote etaient annonces degrades a
 * 20 pour cent, ce qui est exactement la proportion de 8 px dans une bande de
 * 36. Le harnais l'a attrape avant qu'une seule ligne d'interface n'existe.
 *
 * Si aucun pixel n'est examinable, par exemple sur un logo minuscule, la mesure
 * rend null et non zero : ne pas avoir pu regarder n'est pas avoir vu un aplat.
 */
export function m10VariationInterne(image, masque, distanceEncre, lab) {
  const { largeur, hauteur, donnees } = image;
  const teinte = (i) => {
    const p = i * 4;
    return lab(donnees[p], donnees[p + 1], donnees[p + 2]);
  };

  const trajetEstUneRampe = (depart, pas, nombreDePas) => {
    let precedent = teinte(depart);
    const origine = precedent;
    for (let k = 1; k <= nombreDePas; k++) {
      const j = depart + k * pas;
      if (!masque[j]) return false;
      const courant = teinte(j);
      if (ecartLab(precedent, courant) > SEUIL_MARCHE) return false;
      precedent = courant;
    }
    return ecartLab(origine, precedent) > SEUIL_VARIATION;
  };

  const nombreDePas = PORTEE_VARIATION / PAS_VARIATION;
  let examines = 0, variables = 0;
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (!masque[i] || distanceEncre[i] <= MARGE_INTERIEUR) continue;
      const horizontalPossible = x + PORTEE_VARIATION < largeur;
      const verticalPossible = y + PORTEE_VARIATION < hauteur;
      if (!horizontalPossible && !verticalPossible) continue;
      examines++;
      let rampe = false;
      if (horizontalPossible) rampe = trajetEstUneRampe(i, PAS_VARIATION, nombreDePas);
      if (!rampe && verticalPossible) rampe = trajetEstUneRampe(i, PAS_VARIATION * largeur, nombreDePas);
      if (rampe) variables++;
    }
  }

  return {
    partInterieurVariable: examines ? variables / examines : null,
    pixelsExamines: examines,
    pixelsVariables: variables,
  };
}

/* ----------------------------------------------------------- assemblage */

export function mesurer(image, options = {}) {
  const { largeur, hauteur } = image;
  const lab = creerCacheLab();
  const fond = detecterFond(image);
  const brut = masqueEncre(image, fond);
  let aireEncre = 0;
  for (let i = 0; i < brut.length; i++) aireEncre += brut[i];
  const aireMinimale = options.aireMinimale ?? aireMinimalePour(aireEncre);

  const nettoye = nettoyerSalissures(brut, largeur, hauteur, aireMinimale);
  const bouche = boucherTrous(nettoye.masque, largeur, hauteur, aireMinimale);
  const masque = bouche.masque;
  const boite = boiteEnglobante(masque, largeur, hauteur);

  const m1 = m1Dimensions(image);
  const stable = masqueStable(image, masque, lab);
  const m2 = m2Couleurs(image, masque, stable, options);
  const m5 = m5TraitLePlusFin(masque, largeur, hauteur);
  const purete = analyserPurete(image, masque, fond, m2._interne, boite, m5.distanceEncre, lab);
  const m4 = m4Transparence(image);
  const m6 = m6ContreFormesEtEcarts(masque, largeur, hauteur, boite);
  const m7 = m7HauteurDeCapitale(nettoye.composantes, boite);
  const m8 = m8PlusGrandAplat(image, masque, m2._interne, largeur, hauteur, lab);
  const m10 = m10VariationInterne(image, masque, m5.distanceEncre, lab);

  const largeurImprimeeMm = options.largeurImprimeeMm ?? null;
  const enMm = (e) => encadrementEnMm(e, largeur, largeurImprimeeMm);

  return {
    version: 1,
    fond: {
      type: fond.type,
      rvb: fond.rvb ?? null,
      netteteDuBord: fond.partBord ?? null,
      fondNet: fond.net ?? true,
    },
    proprete: {
      composantesRetirees: nettoye.composantesRetirees,
      pixelsRetires: nettoye.pixelsRetires,
      trousBouches: bouche.trousBouches,
      pixelsBouches: bouche.pixelsBouches,
      aireMinimale,
    },
    m1Dimensions: m1,
    m2Couleurs: {
      couleursBrutes: m2.couleursBrutes,
      couleursReelles: m2.couleursReelles,
      pixelsStables: m2.pixelsStables,
      palette: m2.palette,
      pixelsHorsPalette: m2.pixelsHorsPalette,
      pixelsEncre: m2.pixelsEncre,
    },
    m3Halo: {
      partBoite: purete.halo.partBoite,
      pourcentBoite: 100 * purete.halo.partBoite,
      pixelsImpurs: purete.halo.pixelsImpurs,
      pixelsBoite: purete.halo.pixelsBoite,
    },
    m4Transparence: m4,
    m5TraitLePlusFin: {
      encadrementPx: m5.encadrementPx,
      encadrementMm: enMm(m5.encadrementPx),
    },
    m6ContreFormes: {
      plusPetiteContreFormePx: m6.plusPetiteContreFormePx,
      plusPetiteContreFormeMm: enMm(m6.plusPetiteContreFormePx),
      nombreContreFormes: m6.nombreContreFormes,
      ecartMinimalPx: m6.ecartMinimalPx,
      ecartMinimalMm: enMm(m6.ecartMinimalPx),
    },
    m7HauteurDeCapitale: {
      hauteurPx: m7.hauteurPx,
      hauteurMm: m7.hauteurPx === null
        ? null
        : pxVersMm(m7.hauteurPx, largeur, largeurImprimeeMm),
      motif: m7.motif,
    },
    m8PlusGrandAplat: {
      airePx: m8.airePx,
      rvb: m8.rvb ?? null,
      partDeLEncre: m2.pixelsEncre ? m8.airePx / m2.pixelsEncre : 0,
      boite: m8.boite,
    },
    // Le masque d'encre nettoye est rendu avec les mesures : l'interface s'en
    // sert pour montrer ou est le probleme, et la vectorisation pour ne pas
    // refaire le meme travail sur les memes pixels.
    masqueEncre: masque,
    m9TailleMaximale: options.dpiCible
      ? m9TailleMaximaleMm(largeur, hauteur, options.dpiCible)
      : null,
    m10IndicesExport: {
      partInterieurVariable: m10.partInterieurVariable,
      pixelsExamines: m10.pixelsExamines,
      pixelsVariables: m10.pixelsVariables,
      partInterieurImpur: purete.degrade.partInterieurImpur,
      pixelsInterieur: purete.degrade.pixelsInterieur,
      impuretesDeBord: purete.repartition.bord,
      impuretesInterieures: purete.repartition.interieur,
    },
    boiteEncre: boite,
  };
}
