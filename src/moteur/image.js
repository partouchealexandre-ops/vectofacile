/**
 * Preparation d'image : detection du fond, masque d'encre, composantes
 * connexes, boite englobante.
 *
 * Le moteur ne connait PAS les fichiers. Il travaille sur une image nue :
 *   { largeur, hauteur, donnees }  ou donnees est un RVBA de 4 x largeur x hauteur.
 * C'est la condition pour que la meme fonction tourne dans le navigateur
 * (canvas, createImageBitmap) et dans le harnais (fichier .rvba brut), sans
 * une ligne de difference. Le decodage PNG, JPEG ou PDF est le travail des
 * adaptateurs, pas du moteur.
 */

import { versLab, ecartLab } from './couleurs.js';

/** Un pixel est opaque au dessus de ce seuil alpha. */
export const ALPHA_OPAQUE = 128;

/** Ecart Lab au dela duquel un pixel n'est plus le fond. */
export const ECART_FOND = 6;

/** Plancher absolu : sous quatre pixels, ce n'est un dessin dans aucun contexte. */
export const AIRE_MINIMALE_COMPOSANTE = 4;

/**
 * Part de l'encre en dessous de laquelle une composante isolee est du bruit.
 *
 * Un seuil ABSOLU ne peut pas marcher : quatre pixels sont une poussiere sur un
 * logo de 4000 px de large et un point sur un i a 100 px. Le crenelage d'un
 * JPEG le long d'un contour produit des amas de quatre a dix pixels, au dessus
 * du plancher absolu, et ces amas font un a deux pixels d'epaisseur : le trait
 * le plus fin du fichier tombait a 1 px sur toute image compressee.
 *
 * L'echelle qui compte est donc celle du dessin, pas celle du pixel. Un element
 * qui pese moins d'un cinq millieme de l'encre n'est pas un element du dessin a
 * la taille ou on le regarde.
 *
 * Parametre d'INSTRUMENT, cale sur le corpus synthetique. Ce n'est pas un seuil
 * de marquage et il ne vient d'aucune source du referentiel.
 */
export const PART_MINIMALE_COMPOSANTE = 0.0002;

/** Aire minimale d'une composante, pour une quantite d'encre donnee. */
export function aireMinimalePour(aireEncre) {
  return Math.max(AIRE_MINIMALE_COMPOSANTE, Math.round(PART_MINIMALE_COMPOSANTE * aireEncre));
}

/**
 * Detecte le fond.
 * Deux cas seulement, et on ne devine pas entre les deux :
 *   - s'il existe des pixels franchement transparents, le fond est la transparence ;
 *   - sinon le fond est la couleur majoritaire du bord de l'image.
 * Si le bord n'a pas de couleur majoritaire nette, on le dit, et le moteur
 * marquera le detourage comme non evaluable plutot que d'inventer un fond.
 */
export function detecterFond(image) {
  const { largeur, hauteur, donnees } = image;
  let transparents = 0;
  for (let i = 3; i < donnees.length; i += 4) {
    if (donnees[i] < ALPHA_OPAQUE) transparents++;
  }
  const totalPixels = largeur * hauteur;
  if (transparents > 0.02 * totalPixels) {
    return { type: 'transparent', partTransparente: transparents / totalPixels };
  }

  const compte = new Map();
  const ajouter = (x, y) => {
    const p = (y * largeur + x) * 4;
    const cle = (donnees[p] << 16) | (donnees[p + 1] << 8) | donnees[p + 2];
    compte.set(cle, (compte.get(cle) || 0) + 1);
  };
  for (let x = 0; x < largeur; x++) { ajouter(x, 0); ajouter(x, hauteur - 1); }
  for (let y = 1; y < hauteur - 1; y++) { ajouter(0, y); ajouter(largeur - 1, y); }

  let cleMax = 0, nMax = 0, totalBord = 0;
  for (const [cle, n] of compte) {
    totalBord += n;
    if (n > nMax) { nMax = n; cleMax = cle; }
  }
  const part = totalBord ? nMax / totalBord : 0;
  return {
    type: 'couleur',
    rvb: [(cleMax >> 16) & 255, (cleMax >> 8) & 255, cleMax & 255],
    partBord: part,
    net: part >= 0.6,
    partTransparente: transparents / totalPixels,
  };
}

/** Masque d'encre : 1 la ou il y a du dessin, 0 sur le fond. */
export function masqueEncre(image, fond) {
  const { largeur, hauteur, donnees } = image;
  const n = largeur * hauteur;
  const masque = new Uint8Array(n);
  if (fond.type === 'transparent') {
    for (let i = 0; i < n; i++) masque[i] = donnees[i * 4 + 3] >= ALPHA_OPAQUE ? 1 : 0;
    return masque;
  }
  const labFond = versLab(fond.rvb[0], fond.rvb[1], fond.rvb[2]);
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (donnees[p + 3] < ALPHA_OPAQUE) continue;
    const lab = versLab(donnees[p], donnees[p + 1], donnees[p + 2]);
    masque[i] = ecartLab(lab, labFond) > ECART_FOND ? 1 : 0;
  }
  return masque;
}

/**
 * Composantes connexes en 8 voisins, sur un masque binaire.
 * @returns {{etiquettes: Int32Array, composantes: Array}} etiquette 0 = hors masque
 */
export function composantesConnexes(masque, largeur, hauteur) {
  const n = largeur * hauteur;
  const etiquettes = new Int32Array(n);
  const composantes = [];
  const pile = new Int32Array(n);

  for (let depart = 0; depart < n; depart++) {
    if (!masque[depart] || etiquettes[depart]) continue;
    const id = composantes.length + 1;
    let sommet = 0;
    pile[sommet++] = depart;
    etiquettes[depart] = id;
    let aire = 0, xMin = largeur, xMax = -1, yMin = hauteur, yMax = -1;
    let toucheBord = false;

    while (sommet > 0) {
      const i = pile[--sommet];
      const x = i % largeur, y = (i / largeur) | 0;
      aire++;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
      if (x === 0 || y === 0 || x === largeur - 1 || y === hauteur - 1) toucheBord = true;

      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hauteur) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= largeur) continue;
          const j = yy * largeur + xx;
          if (masque[j] && !etiquettes[j]) {
            etiquettes[j] = id;
            pile[sommet++] = j;
          }
        }
      }
    }
    composantes.push({ id, aire, xMin, xMax, yMin, yMax, toucheBord });
  }
  return { etiquettes, composantes };
}

/**
 * Retire du masque les composantes plus petites que aireMinimale.
 * Rend le masque nettoye ET le decompte de ce qui a ete retire : ce decompte
 * est lui meme un signal utile au diagnostic (un fichier avec 340 pixels
 * orphelins a ete detoure a la main ou compresse trop fort).
 */
export function nettoyerSalissures(masque, largeur, hauteur, aireMinimale = AIRE_MINIMALE_COMPOSANTE) {
  const { etiquettes, composantes } = composantesConnexes(masque, largeur, hauteur);
  const aRetirer = new Set();
  let pixelsRetires = 0;
  for (const c of composantes) {
    if (c.aire < aireMinimale) { aRetirer.add(c.id); pixelsRetires += c.aire; }
  }
  if (aRetirer.size === 0) {
    return { masque, composantes, etiquettes, composantesRetirees: 0, pixelsRetires: 0 };
  }
  const propre = new Uint8Array(masque.length);
  for (let i = 0; i < masque.length; i++) {
    propre[i] = masque[i] && !aRetirer.has(etiquettes[i]) ? 1 : 0;
  }
  const apres = composantesConnexes(propre, largeur, hauteur);
  return {
    masque: propre,
    composantes: apres.composantes,
    etiquettes: apres.etiquettes,
    composantesRetirees: aRetirer.size,
    pixelsRetires,
  };
}

/**
 * Bouche les trous minuscules du masque : les composantes de FOND fermees,
 * plus petites que aireMinimale, redeviennent de l'encre.
 *
 * C'est l'operation symetrique de nettoyerSalissures, et elle est arrivee pour
 * la meme raison, dans l'autre sens. Un JPEG produit du crenelage le long des
 * contours : quelques pixels presque blancs se retrouvent A L'INTERIEUR du
 * dessin, tout pres du bord. L'encre restante entre ce trou et le bord fait
 * alors un ou deux pixels de large, et la mesure du trait le plus fin rend
 * "1 px" pour un logo dont le plus fin trait fait quinze fois plus.
 *
 * Le seuil est le meme que pour les salissures : sous quatre pixels, ce n'est
 * pas un dessin, c'est du bruit. Une contre forme voulue, meme minuscule, en
 * fait davantage. Et comme pour les salissures, le nombre de trous bouches est
 * rendu, pas avale.
 */
export function boucherTrous(masque, largeur, hauteur, aireMinimale = AIRE_MINIMALE_COMPOSANTE) {
  const exterieur = fondExterieur(masque, largeur, hauteur);
  const ferme = new Uint8Array(masque.length);
  for (let i = 0; i < masque.length; i++) ferme[i] = (!masque[i] && !exterieur[i]) ? 1 : 0;
  const { etiquettes, composantes } = composantesConnexes(ferme, largeur, hauteur);
  const aBoucher = new Set();
  let pixelsBouches = 0;
  for (const c of composantes) {
    if (c.aire < aireMinimale) { aBoucher.add(c.id); pixelsBouches += c.aire; }
  }
  if (aBoucher.size === 0) return { masque, trousBouches: 0, pixelsBouches: 0 };
  const plein = new Uint8Array(masque);
  for (let i = 0; i < masque.length; i++) {
    if (ferme[i] && aBoucher.has(etiquettes[i])) plein[i] = 1;
  }
  return { masque: plein, trousBouches: aBoucher.size, pixelsBouches };
}

/** Boite englobante d'un masque, ou null si le masque est vide. */
export function boiteEnglobante(masque, largeur, hauteur) {
  let xMin = largeur, xMax = -1, yMin = hauteur, yMax = -1;
  for (let y = 0; y < hauteur; y++) {
    const base = y * largeur;
    for (let x = 0; x < largeur; x++) {
      if (!masque[base + x]) continue;
      if (x < xMin) xMin = x;
      if (x > xMax) xMax = x;
      if (y < yMin) yMin = y;
      if (y > yMax) yMax = y;
    }
  }
  if (xMax < 0) return null;
  return { xMin, xMax, yMin, yMax, largeur: xMax - xMin + 1, hauteur: yMax - yMin + 1 };
}

/**
 * Fond joignable depuis le bord de l'image : tout ce qui n'est pas encre et
 * qu'on atteint en partant du bord sans traverser d'encre.
 * Le complement, ce sont les contre formes, les trous fermes du dessin.
 */
export function fondExterieur(masque, largeur, hauteur) {
  const n = largeur * hauteur;
  const exterieur = new Uint8Array(n);
  const pile = new Int32Array(n);
  let sommet = 0;
  const pousser = (i) => {
    if (!masque[i] && !exterieur[i]) { exterieur[i] = 1; pile[sommet++] = i; }
  };
  for (let x = 0; x < largeur; x++) { pousser(x); pousser((hauteur - 1) * largeur + x); }
  for (let y = 0; y < hauteur; y++) { pousser(y * largeur); pousser(y * largeur + largeur - 1); }

  while (sommet > 0) {
    const i = pile[--sommet];
    const x = i % largeur, y = (i / largeur) | 0;
    if (x > 0) pousser(i - 1);
    if (x < largeur - 1) pousser(i + 1);
    if (y > 0) pousser(i - largeur);
    if (y < hauteur - 1) pousser(i + largeur);
  }
  return exterieur;
}

/**
 * Masque des pixels STABLES : un pixel d'encre dont les quatre voisins d'encre
 * portent la meme teinte a ECART_STABILITE pres.
 *
 * Pourquoi cette notion existe, et c'est la decision la plus importante du
 * module couleur. Un JPEG fabrique une rampe de teintes intermediaires le long
 * de chaque frontiere entre deux aplats. Ces teintes ne sont voulues par
 * personne, mais elles sont nombreuses et regulieres : sur une frontiere de
 * 400 pixels de haut, une meme teinte de melange peut totaliser assez de
 * pixels pour franchir le seuil de couverture et se faire compter comme une
 * dixieme couleur. Le client, lui, en a dessine neuf.
 *
 * On compte donc les couleurs REELLES sur les pixels stables seulement, et les
 * couleurs BRUTES sur tous les pixels d'encre. L'ecart entre les deux nombres
 * est precisement ce que le diagnostic doit montrer.
 */
export const ECART_STABILITE = 3;

export function masqueStable(image, masque, lab, seuil = ECART_STABILITE) {
  const { largeur, hauteur, donnees } = image;
  const stable = new Uint8Array(masque.length);
  const teinte = (i) => {
    const p = i * 4;
    return lab(donnees[p], donnees[p + 1], donnees[p + 2]);
  };
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (!masque[i]) continue;
      const ici = teinte(i);
      let voisinsEncre = 0;
      let uniforme = true;
      const voisins = [];
      if (x > 0) voisins.push(i - 1);
      if (x < largeur - 1) voisins.push(i + 1);
      if (y > 0) voisins.push(i - largeur);
      if (y < hauteur - 1) voisins.push(i + largeur);
      for (const j of voisins) {
        if (!masque[j]) continue;
        voisinsEncre++;
        if (ecartLab(ici, teinte(j)) > seuil) { uniforme = false; break; }
      }
      // Un pixel entoure de fond est isole : il n'aide pas a definir la palette.
      stable[i] = (uniforme && voisinsEncre >= 2) ? 1 : 0;
    }
  }
  return stable;
}
