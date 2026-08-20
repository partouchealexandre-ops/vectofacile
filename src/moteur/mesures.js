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
      return cotesOpposes(i, distanceFond[i] + 1, masque, largeur, hauteur, ANGLE_OPPOSITION, 16, false);
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
    // Un pixel qui n'est PROCHE d'aucune couleur reelle est un pixel de
    // lisere ou de bruit JPEG : il n'entre dans aucun plan. Sans ce filtre,
    // les franges de compression entre deux aplats se rattachent au plan le
    // plus proche et y dessinent des rubans d'un pixel, que la mesure prend
    // pour des traits. C'est le bug numero 9 de la table des pieges, revenu
    // par une autre porte : le harnais l'a signale sur couleurs_09_jpeg a la
    // premiere execution. ECART_FUSION est deja LE rayon en deca duquel le
    // moteur considere qu'une teinte EST une couleur : meme regle ici, une
    // seule definition de la proximite dans tout le moteur.
    affectation[i] = meilleureDistance < ECART_FUSION ? meilleur : -1;
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

/* ------------------------------------------------- plans de couleur */

/**
 * LE LOGO SUR APLAT, ou pourquoi la mesure par plan de couleur existe.
 *
 * Trouve le 20/08 par Alex, sur un logo reel : un badge rond dont le texte
 * creme est pose sur un disque orange. Le moteur repondait « trait le plus fin
 * non mesure » alors que le logo est plein de lettres fines.
 *
 * La cause : toutes les mesures de geometrie travaillaient sur le masque
 * d'ENCRE, c'est a dire l'union de toutes les couleurs contre le fond. Sur ce
 * badge, l'union est un disque plein : les lettres n'y existent pas, puisque
 * creme et orange sont tous deux de l'encre. Le moteur etait aveugle a tout
 * trait pose sur un aplat, soit une part enorme des logos reels.
 *
 * La correction est aussi la semantique du METIER : en serigraphie comme en
 * tampographie, CHAQUE COULEUR EST UN ECRAN. Le trait le plus fin qui compte
 * est le plus fin de chaque plan de couleur, pas celui de l'union. Un ecart
 * entre deux lettres creme est un vrai ecart sur l'ecran creme, meme si le
 * fond de cet ecart est de l'encre orange.
 *
 * Chaque pixel d'encre est rattache a la couleur reelle la plus proche, les
 * pixels de lisere compris : un lisere n'est jamais un plan a lui seul.
 */
export function affectationParCouleur(image, masque, palette, lab) {
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
  return affectation;
}

/**
 * OUVERTURE MORPHOLOGIQUE d'un plan : une erosion puis une dilatation, en
 * 4-voisinage.
 *
 * Pourquoi elle est indispensable ici et pas sur le masque global : les
 * franges de compression JPEG entre deux aplats restent parfois assez proches
 * de la couleur voisine pour passer le filtre ECART_FUSION. Elles se
 * rattachent alors au plan en rubans d'un ou deux pixels le long de la
 * frontiere, et la mesure les prend pour des traits. Le harnais l'a montre
 * sur couleurs_09_jpeg : neuf aplats sans aucun trait, annonces porteurs d'un
 * trait d'un pixel. C'est le piege numero 9 de la table, revenu par la porte
 * des plans.
 *
 * L'ouverture supprime tout ce qui a moins de trois pixels d'epaisseur, et
 * RECONSTRUIT a l'identique tout ce qui en a trois ou plus : un trait reel de
 * 3 px ressort a 3 px, un ruban de frange disparait. Consequence assumee et
 * documentee : un trait reel de MOINS de trois pixels pose sur un aplat n'est
 * pas mesurable par les plans. Le masque global le voit encore quand il borde
 * le fond ; pose sur un aplat, il est sous la resolution de l'instrument.
 *
 * PARAMETRE D'INSTRUMENT, comme ECART_FUSION : dit comment on mesure, jamais
 * ce qui est marquable.
 */
function ouvrir(masque, largeur, hauteur) {
  const n = masque.length;
  const erode = new Uint8Array(n);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (!masque[i]) continue;
      erode[i] = (x > 0 && masque[i - 1] && x < largeur - 1 && masque[i + 1]
        && y > 0 && masque[i - largeur] && y < hauteur - 1 && masque[i + largeur]) ? 1 : 0;
    }
  }
  const ouvert = new Uint8Array(n);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (erode[i]
        || (x > 0 && erode[i - 1]) || (x < largeur - 1 && erode[i + 1])
        || (y > 0 && erode[i - largeur]) || (y < hauteur - 1 && erode[i + largeur])) {
        // La dilatation ne recree jamais un pixel qui n'etait pas de l'encre.
        if (masque[i]) ouvert[i] = 1;
      }
    }
  }
  return ouvert;
}

/**
 * FERMETURE MORPHOLOGIQUE : une dilatation puis une erosion. Le pendant de
 * l'ouverture, pour les CREUX. L'ouverture nettoie ce qui depasse, la
 * fermeture comble ce qui s'enfonce : les couloirs et les encoches de moins
 * de trois pixels, la ou l'exclusion du lisere a grignote le bord d'une
 * forme. Sans elle, l'ecart minimal d'un plan mesurait ces encoches, 1 a
 * 2 px, au lieu des vrais ecarts entre elements. Un ecart reel de 3 px ou
 * plus traverse la fermeture inchange. Meme statut : parametre d'instrument.
 */
function fermer(masque, largeur, hauteur) {
  const n = masque.length;
  const dilate = new Uint8Array(n);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (masque[i]
        || (x > 0 && masque[i - 1]) || (x < largeur - 1 && masque[i + 1])
        || (y > 0 && masque[i - largeur]) || (y < hauteur - 1 && masque[i + largeur])) {
        dilate[i] = 1;
      }
    }
  }
  const ferme = new Uint8Array(n);
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (!dilate[i]) continue;
      ferme[i] = (x > 0 && dilate[i - 1] && x < largeur - 1 && dilate[i + 1]
        && y > 0 && dilate[i - largeur] && y < hauteur - 1 && dilate[i + largeur]) ? 1 : 0;
    }
  }
  return ferme;
}

/** La borne basse d'un encadrement, ou +Infini s'il n'y en a pas. */
function basseOuInfini(encadrement) {
  return encadrement && encadrement.basse !== null && encadrement.basse !== undefined
    ? encadrement.basse : Infinity;
}

/**
 * Mesure la geometrie plan par plan et rend, pour le trait comme pour
 * l'ecart, le PIRE des plans : c'est lui que l'atelier rencontrera.
 * Rend null si moins de deux couleurs, le masque global suffit alors.
 */
export function mesurerParPlans(image, masque, palette, lab, largeur, hauteur, boite) {
  if (!palette || palette.length < 2) return null;
  const affectation = affectationParCouleur(image, masque, palette, lab);

  const plans = [];
  for (let k = 0; k < palette.length; k++) {
    const brut = new Uint8Array(masque.length);
    for (let i = 0; i < masque.length; i++) {
      if (affectation[i] === k) brut[i] = 1;
    }
    const plan = ouvrir(brut, largeur, hauteur);
    let aire = 0;
    for (let i = 0; i < plan.length; i++) aire += plan[i];
    if (aire === 0) continue;
    plans.push({ index: k, rvb: palette[k].rvb, masque: plan, aire });
  }

  let trait = null;
  let ecart = null;
  let contreFormes = 0;
  let plusPetiteContreForme = null;
  const parCouleur = [];

  for (const plan of plans) {
    const m5 = m5TraitLePlusFin(plan.masque, largeur, hauteur);
    // L'ecart se mesure sur le plan FERME : l'ouverture a nettoye ce qui
    // depasse, la fermeture comble les encoches que l'exclusion du lisere a
    // laissees au bord des formes. Voir fermer().
    const m6 = m6ContreFormesEtEcarts(fermer(plan.masque, largeur, hauteur), largeur, hauteur, boite);
    parCouleur.push({
      rvb: plan.rvb,
      traitPx: m5.encadrementPx,
      ecartPx: m6.ecartMinimalPx,
      contreFormes: m6.nombreContreFormes,
    });
    if (basseOuInfini(m5.encadrementPx) < basseOuInfini(trait?.encadrementPx)) {
      trait = { encadrementPx: m5.encadrementPx, rvb: plan.rvb };
    }
    // LA RESOLUTION DE L'INSTRUMENT SUR LES PLANS EST DE TROIS PIXELS, dans
    // les deux sens. Sous trois pixels, un couloir entre deux zones d'un plan
    // est indiscernable du lisere que l'affectation a exclu : le badge reel
    // du 20/08 annoncait un ecart de 1 px sur son plan orange, la ou deux
    // encres se touchent. On ne rend pas une mesure qu'on ne sait pas
    // distinguer d'un artefact. Consequence honnete : sur un logo de
    // plusieurs couleurs, un ecart reel de moins de trois pixels n'est pas
    // mesure, exactement comme un trait de moins de trois pixels pose sur un
    // aplat.
    if (basseOuInfini(m6.ecartMinimalPx) >= 3
        && basseOuInfini(m6.ecartMinimalPx) < basseOuInfini(ecart?.ecartMinimalPx)) {
      ecart = { ecartMinimalPx: m6.ecartMinimalPx, rvb: plan.rvb };
    }
    contreFormes += m6.nombreContreFormes ?? 0;
    if (basseOuInfini(m6.plusPetiteContreFormePx) < basseOuInfini(plusPetiteContreForme)) {
      plusPetiteContreForme = m6.plusPetiteContreFormePx;
    }
  }

  // La hauteur de capitale, par plan aussi : sur le badge, les lettres sont
  // des composantes du plan creme, jamais du masque global. On essaie les
  // plans dans l'ordre du nombre de composantes, le texte en a beaucoup.
  // Si aucun plan n'y arrive, on garde le MOTIF du plan le plus prometteur :
  // « trop peu de composantes » etait un mensonge sur un badge couvert de
  // lettres, la vraie raison etait « aucune ligne de pied commune », le texte
  // courait sur un arc de cercle.
  let capitale = null;
  const candidats = plans
    .map((plan) => ({ plan, composantes: composantesConnexes(plan.masque, largeur, hauteur).composantes }))
    .sort((a, b) => b.composantes.length - a.composantes.length);
  for (const { plan, composantes } of candidats) {
    const essai = m7HauteurDeCapitale(composantes, boite);
    if (essai.hauteurPx !== null) { capitale = { ...essai, rvb: plan.rvb }; break; }
    if (!capitale) capitale = { ...essai, rvb: plan.rvb };
  }

  return { trait, ecart, contreFormes, plusPetiteContreForme, capitale, parCouleur };
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

  // Les plans de couleur corrigent les mesures globales quand le logo a
  // plusieurs couleurs. Le masque global reste calcule : sa transformee de
  // distance sert a la purete et a la variation interne, et son trait reste
  // valable quand il est le plus fin. Voir le commentaire de
  // affectationParCouleur pour le pourquoi.
  const plans = mesurerParPlans(image, masque, m2._interne, lab, largeur, hauteur, boite);
  if (plans) {
    // LE TRAIT : le pire des deux mondes, et c'est voulu. Les plans voient ce
    // que l'union ne voit pas, un motif pose sur un aplat ; l'union voit ce
    // que les plans, ouverts a 3 px, ne voient plus, un trait de 1 ou 2 px
    // borde par le fond. On retient le plus fin des deux.
    if (basseOuInfini(plans.trait?.encadrementPx) < basseOuInfini(m5.encadrementPx)) {
      m5.encadrementPx = plans.trait.encadrementPx;
      m5.couleurPorteuse = plans.trait.rvb;
    }
    // L'ECART ET LES CONTRE-FORMES : les plans SEULS. Sur un logo de
    // plusieurs couleurs, l'ecart du masque global mesure le lisere
    // d'antialiasing entre deux couleurs qui se touchent, un pixel qui
    // n'existe sur aucun ecran. Le badge reel du 20/08 annoncait « ecart de
    // 0,04 mm » entre son texte et son disque : cet ecart n'existe pas, les
    // deux encres se touchent. Deux elements de MEME couleur a moins de 3 px
    // ne sont plus mesurables, c'est la resolution de l'instrument.
    m6.ecartMinimalPx = plans.ecart?.ecartMinimalPx ?? null;
    m6.couleurPorteuse = plans.ecart?.rvb ?? null;
    m6.nombreContreFormes = plans.contreFormes;
    m6.plusPetiteContreFormePx = plans.plusPetiteContreForme;
    if (m7.hauteurPx === null && plans.capitale) {
      Object.assign(m7, plans.capitale);
    }
  }
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
    // LA BOITE DE L'ENCRE, exposee depuis le pivot produit du 20/08/2026.
    //
    // Le rapport de m1 est celui de l'IMAGE, marges comprises. Un logo tres
    // large centre dans un PNG carre donnerait un rapport de 1, et la grille
    // produits en deduirait une taille de marquage fausse. Ce qu'on inscrit
    // dans une zone, c'est le dessin, pas le fichier : c'est donc la boite
    // englobante de l'encre qui porte le rapport utile.
    boiteEncre: boite ? {
      largeurPx: boite.largeur,
      hauteurPx: boite.hauteur,
      rapport: boite.hauteur ? boite.largeur / boite.hauteur : null,
    } : null,
    m2Couleurs: {
      couleursBrutes: m2.couleursBrutes,
      couleursReelles: m2.couleursReelles,
      pixelsStables: m2.pixelsStables,
      palette: m2.palette,
      pixelsHorsPalette: m2.pixelsHorsPalette,
      // Part de l'encre qui ne correspond a AUCUNE couleur retenue. C'est le
      // discriminant le plus franc entre un dessin et une photo : nul ou quasi
      // nul sur tout logo, meme tres compresse ; 0,86 sur une image de bruit.
      partHorsPalette: m2.pixelsEncre ? m2.pixelsHorsPalette / m2.pixelsEncre : 0,
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
      couleurPorteuse: m5.couleurPorteuse ?? null,
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
