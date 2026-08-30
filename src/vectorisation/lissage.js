/**
 * Ajustement de courbes sur le trace pixel exact de VTracer.
 *
 * POURQUOI CE MODULE EXISTE, mesure du 26/08/2026 sur huit logos clients.
 *
 * En mode spline, VTracer pose ses ancres sur un decoupage a pas fixe : un
 * grand arc de 300 px n'en recoit que trois ou quatre, et chaque cubique
 * couvre plus de courbure qu'une cubique ne sait en porter. La courbe
 * s'aplatit entre deux ancres, et l'oeil lit ce meplat comme une bosselure,
 * meme quand l'ecart reste sous le pixel. Sur le logo de la Fondation de
 * Nice, la panse du D en portait une visible au premier zoom, et aucun
 * reglage expose par VTracer (cornerThreshold, lengthThreshold,
 * spliceThreshold, maxIterations) ne la retirait : ce n'est pas un reglage
 * qui manque, c'est le placement des ancres qui est trop pauvre.
 *
 * On reprend donc l'ajustement a notre compte. VTracer fournit le trace
 * PIXEL, exact par construction : c'est la frontiere mesuree, marche par
 * marche. Ce module la reechantillonne, detecte les coins reels, lisse
 * l'escalier entre les coins, puis ajuste des cubiques par moindres carres
 * avec une erreur bornee (Schneider, Graphics Gems, adapte). Les coins
 * restent des coins, les ancres se posent la ou l'erreur l'exige, et deux
 * courbes voisines partagent leur tangente : plus de meplat, plus de
 * cassure.
 *
 * Verification sur le meme logo, rendu contre la frontiere mesuree :
 * l'ecart total passe de 9 248 px (spline VTracer) a 6 243 px, ET le trace
 * est plus lisse. Ce n'est pas un compromis fidelite contre beaute, les
 * deux progressent ensemble.
 */

/*
 * LES PARAMETRES DE L'INSTRUMENT. Aucun n'est un seuil de marquage : ils
 * decrivent notre outil, pas les techniques.
 */

// Pas de reechantillonnage le long de la frontiere, en pixels. Un pas de 1
// garde toute l'information de l'escalier sans en garder le bruit.
export const PAS_ECHANTILLON_PX = 1.0;

// Demi-fenetre, en echantillons, des cordes qui encadrent un point pour
// mesurer son virage. A 3 px de part et d'autre, une marche d'escalier
// isolee ne pese presque rien, un vrai coin pese tout.
export const FENETRE_COIN = 3;

// Virage au dela duquel un point est un coin, en degres. Un coin droit
// tourne de 90, une pointe d'etoile de plus de 140 : les deux passent. Une
// asperite de compression JPEG tourne de 20 a 50 sur une frontiere par
// ailleurs ronde : elle passe SOUS le seuil et le lissage l'efface. Mesure
// sur les pois du logo Fondation : a 55, des coins fantomes crantaient les
// ronds ; a 75, plus aucun, et toutes les serifs restent vives.
export const SEUIL_COIN_DEG = 75;

// Les coins PEU PRONONCES. La jonction entre le fut vertical d'une lettre et
// un toit pentu du logo Chicago tourne de 10 a 40 degres : sous le seuil
// franc, aucun coin n'etait pose, un meme arc enjambait le fut et la pente,
// et l'ajustement ondulait sur l'ensemble. Un tel coin n'est accepte que si
// les DEUX cotes sont stables : direction posee et bord droit de part et
// d'autre. C'est ce qui le distingue d'une asperite de compression, dont
// les alentours churnent dans tous les sens.
export const SEUIL_COIN_DOUX_DEG = 25;
const COIN_DOUX_RETRAIT = 3;   // echantillons ignores autour du candidat
const COIN_DOUX_FENETRE = 6;   // longueur des cordes laterales
const COIN_DOUX_DROITURE = 0.7; // ecart max des cotes a leur corde

// Demi-fenetre du lissage des echantillons entre les coins. Deux pixels
// suffisent a fondre les marches ; les coins eux memes ne sont jamais
// lisses, et le lissage ne traverse jamais un coin.
export const RAYON_LISSAGE = 2;

// Erreur maximale toleree entre la courbe ajustee et la frontiere
// reechantillonnee, en pixels. Au dela, la courbe est scindee au point le
// plus faux et chaque moitie est reajustee.
export const TOLERANCE_AJUSTEMENT_PX = 1.0;

// Les deux criteres qui font qu'un arc est livre comme une DROITE. Mesure du
// 26/08/2026, soir, sur le logo U*BREW zoome par Alexandre : le bord haut du
// E est droit AU PIXEL PRES dans le masque mesure (y = 78 sur 140 colonnes),
// et l'ajustement le rendait « presque droit », un flottement d'un pixel
// tolere par l'erreur bornee. Sur une courbe, ce flottement est invisible ;
// sur un trait que l'oeil sait droit, il se lit comme une vague. L'acuite de
// l'oeil sur l'alignement est superieure a son acuite sur tout le reste :
// une droite doit sortir droite, exactement.
//
// L'ecart maximal seul ne suffit pas : un troncon de tres grand cercle tient
// aussi contre sa corde, et le livrer en droite facetterait le cercle. La
// difference est dans la FORME des ecarts : le bruit d'un bord droit oscille
// des deux cotes sans structure, un arc de cercle bombe d'un seul cote en
// parabole. On ajuste donc une parabole sur les ecarts : sa fleche mesure le
// bombement reel, insensible au bruit qui s'annule dans la somme, et
// insensible aussi a un coin que le bruit a decale, absorbe par le terme
// lineaire. Un bord droit au coin pres passe ; un arc, meme discret, reste
// une courbe.
export const ECART_DROITE_PX = 0.85;
export const FLECHE_DROITE_PX = 0.35;

// L'acceptation s'elargit avec la LONGUEUR. Mesure sur le logo Chicago,
// 416 px de large : le flou JPEG fait errer la frontiere d'un fut de lettre
// de 1 a 2 px sur 150 px de haut, sans structure. Une tolerance fixe de
// 0,85 refusait la droite et la courbe suivait l'erreur : les futs
// ondulaient. Sur une grande longueur, une derive sans structure est du
// bruit ; une vraie courbe, elle, accumule une fleche en L2/8R que le
// critere de parabole detecte toujours.
export function toleranceDroite(longueur) {
  return Math.min(2.4, Math.max(ECART_DROITE_PX, ECART_DROITE_PX + 0.011 * (longueur - 40)));
}

// Remise a l'aplomb : une droite a moins de 1,3 degre de la verticale ou de
// l'horizontale EST verticale ou horizontale. Les futs du logo Chicago sont
// verticaux dans le dessin d'origine ; les rendre presque verticaux, chacun
// avec sa derive, se lit immediatement comme un defaut. Une italique voulue
// penche de plus de 2 degres : elle ne se fait pas redresser.
export const APLOMB_DEG = 1.3;
export const APLOMB_LONGUEUR_MIN_PX = 15;

const ITERATIONS_REPARAMETRAGE = 4;
const PROFONDEUR_MAXIMALE = 24;

function soustraire(a, b) { return { x: a.x - b.x, y: a.y - b.y }; }
function norme(v) { return Math.hypot(v.x, v.y); }
function normaliser(v) { const n = norme(v) || 1; return { x: v.x / n, y: v.y / n }; }

/* Reechantillonne une boucle fermee a pas sensiblement constant. */
function reechantillonner(pts, pas) {
  const n = pts.length;
  const longueurs = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const d = norme(soustraire(pts[(i + 1) % n], pts[i]));
    longueurs.push(d); total += d;
  }
  if (total < pas * 3) return null;
  const compte = Math.max(8, Math.round(total / pas));
  const vrai = total / compte;
  const sortie = [];
  let i = 0, avance = 0;
  for (let k = 0; k < compte; k++) {
    const objectif = k * vrai;
    while (avance + longueurs[i] < objectif) { avance += longueurs[i]; i = (i + 1) % n; }
    const t = longueurs[i] ? (objectif - avance) / longueurs[i] : 0;
    const a = pts[i], b = pts[(i + 1) % n];
    sortie.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return sortie;
}

/* Les coins : virage entre la corde arriere et la corde avant, maximum
 * local dans sa fenetre. */
function detecterCoins(S, fenetre, seuilDeg) {
  const n = S.length;
  const angles = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const av = soustraire(S[i], S[(i - fenetre + n) % n]);
    const ap = soustraire(S[(i + fenetre) % n], S[i]);
    const na = norme(av), nb = norme(ap);
    if (!na || !nb) continue;
    let cos = (av.x * ap.x + av.y * ap.y) / (na * nb);
    cos = Math.max(-1, Math.min(1, cos));
    angles[i] = Math.acos(cos) * 180 / Math.PI;
  }
  // La suppression des doublons regarde MOINS LOIN que la fenetre de mesure :
  // le bout d'un trait de 3 px porte deux coins droits a 3 px l'un de
  // l'autre, et une suppression a la largeur de la fenetre en avalait un,
  // arrondissant le bout du trait. Mesure : trait_03px passait de 99,6 a
  // 93,1 pour cent de recouvrement.
  const rayonSuppression = Math.max(1, fenetre - 1);
  const coins = [];
  const cote = (i, sens) => {
    // corde laterale : de retrait a retrait+fenetre, dans le sens demande
    const a = S[(i + sens * COIN_DOUX_RETRAIT + n) % n];
    const b = S[(i + sens * (COIN_DOUX_RETRAIT + COIN_DOUX_FENETRE) + n) % n];
    const d = soustraire(b, a);
    const l = norme(d);
    if (!l) return null;
    // droiture : chaque echantillon du cote tient contre la corde
    for (let k = 1; k < COIN_DOUX_FENETRE; k++) {
      const p = S[(i + sens * (COIN_DOUX_RETRAIT + k) + n) % n];
      const e = ((p.x - a.x) * d.y - (p.y - a.y) * d.x) / l;
      if (Math.abs(e) > COIN_DOUX_DROITURE) return null;
    }
    return { x: d.x / l, y: d.y / l };
  };
  for (let i = 0; i < n; i++) {
    if (angles[i] <= SEUIL_COIN_DOUX_DEG) continue;
    let retenu = angles[i] > seuilDeg;
    if (!retenu) {
      // LE VIRAGE D'UN COIN EST LOCALISE, celui d'un petit arc est partout.
      // Un arc de rayon 12 px tourne d'autant au centre qu'a six pas de la :
      // si le virage persiste sur les cotes, ce n'est pas un coin, c'est une
      // courbe serree, et on la laisse aux courbes. Un vrai coin doux a des
      // cotes qui ne tournent presque plus.
      const gauche = angles[(i - 2 * FENETRE_COIN + n) % n];
      const droite = angles[(i + 2 * FENETRE_COIN) % n];
      const isole = gauche < angles[i] * 0.4 && droite < angles[i] * 0.4;
      if (isole) {
        const g = cote(i, -1), dr = cote(i, +1);
        if (g && dr) {
          // direction entrante au coin : l'oppose de la corde arriere
          let c = -(g.x * dr.x + g.y * dr.y);
          c = Math.max(-1, Math.min(1, c));
          const virage = Math.acos(c) * 180 / Math.PI;
          retenu = virage > SEUIL_COIN_DOUX_DEG;
        }
      }
    }
    if (!retenu) continue;
    let max = true;
    for (let d = -rayonSuppression; d <= rayonSuppression && max; d++) {
      const j = (i + d + n) % n;
      if (angles[j] > angles[i] || (angles[j] === angles[i] && j < i && d !== 0)) max = false;
    }
    if (max) coins.push(i);
  }
  coins.sort((a, b) => a - b);
  return coins;
}

/* Lissage par moyenne locale entre les coins. Un coin reste exact, et la
 * fenetre s'arrete au coin : lisser a travers un coin l'arrondirait. */
function lisserPoints(S, coins, rayon) {
  const n = S.length;
  const estCoin = new Uint8Array(n);
  for (const c of coins) estCoin[c] = 1;
  const sortie = new Array(n);
  for (let i = 0; i < n; i++) {
    if (estCoin[i]) { sortie[i] = S[i]; continue; }
    let sx = 0, sy = 0, c = 0, bloque = false;
    for (let d = -rayon; d <= rayon; d++) {
      const j = (i + d + n) % n;
      if (estCoin[j] && d !== 0) { bloque = true; break; }
      sx += S[j].x; sy += S[j].y; c++;
    }
    sortie[i] = bloque ? S[i] : { x: sx / c, y: sy / c };
  }
  return sortie;
}

function pointBezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const b0 = u * u * u, b1 = 3 * u * u * t, b2 = 3 * u * t * t, b3 = t * t * t;
  return { x: b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x,
           y: b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y };
}

/* Moindres carres d'une cubique, tangentes imposees aux extremites.
 * Convention de Schneider : t1 pointe vers l'AVANT de la courbe depuis son
 * depart, t2 pointe vers l'ARRIERE depuis son arrivee. */
function ajusterCubique(pts, u, t1, t2) {
  const n = pts.length;
  const p0 = pts[0], p3 = pts[n - 1];
  let c00 = 0, c01 = 0, c11 = 0, x0 = 0, x1 = 0;
  for (let i = 0; i < n; i++) {
    const ub = 1 - u[i];
    const b0 = ub * ub * ub, b1 = 3 * ub * ub * u[i], b2 = 3 * ub * u[i] * u[i], b3 = u[i] ** 3;
    const a1x = t1.x * b1, a1y = t1.y * b1;
    const a2x = t2.x * b2, a2y = t2.y * b2;
    c00 += a1x * a1x + a1y * a1y;
    c01 += a1x * a2x + a1y * a2y;
    c11 += a2x * a2x + a2y * a2y;
    const tx = pts[i].x - (p0.x * (b0 + b1) + p3.x * (b2 + b3));
    const ty = pts[i].y - (p0.y * (b0 + b1) + p3.y * (b2 + b3));
    x0 += a1x * tx + a1y * ty;
    x1 += a2x * tx + a2y * ty;
  }
  const det = c00 * c11 - c01 * c01;
  let alpha1, alpha2;
  if (Math.abs(det) > 1e-9) {
    alpha1 = (x0 * c11 - x1 * c01) / det;
    alpha2 = (c00 * x1 - c01 * x0) / det;
  } else { alpha1 = alpha2 = 0; }
  const dist = norme(soustraire(p3, p0));
  // Des alphas absurdes (matrice mal conditionnee) envoient les poignees
  // loin du dessin : la courbe file en pointe hors de la forme. On revient
  // alors a la poignee neutre du tiers de corde.
  if (!(alpha1 > 1e-6) || !(alpha2 > 1e-6) || alpha1 > dist || alpha2 > dist) {
    alpha1 = alpha2 = dist / 3;
  }
  return [p0,
    { x: p0.x + t1.x * alpha1, y: p0.y + t1.y * alpha1 },
    { x: p3.x + t2.x * alpha2, y: p3.y + t2.y * alpha2 },
    p3];
}

function parametrerParCorde(pts) {
  const u = [0];
  for (let i = 1; i < pts.length; i++) u[i] = u[i - 1] + norme(soustraire(pts[i], pts[i - 1]));
  const total = u[u.length - 1] || 1;
  return u.map((v) => v / total);
}

function erreurMax(pts, u, courbe) {
  let pire = 0, indice = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pointBezier(...courbe, u[i]);
    const d = norme(soustraire(pts[i], p));
    if (d > pire) { pire = d; indice = i; }
  }
  return { pire, indice };
}

/* Newton-Raphson : rapproche chaque parametre du point de courbe le plus
 * proche de son echantillon, pour reajuster sans scinder. */
function reparametrer(pts, u, courbe) {
  const [p0, p1, p2, p3] = courbe;
  return u.map((ui, i) => {
    if (i === 0 || i === u.length - 1) return ui;
    const q = pointBezier(p0, p1, p2, p3, ui);
    const iu = 1 - ui;
    const d1x = 3 * ((p1.x - p0.x) * iu * iu + 2 * (p2.x - p1.x) * iu * ui + (p3.x - p2.x) * ui * ui);
    const d1y = 3 * ((p1.y - p0.y) * iu * iu + 2 * (p2.y - p1.y) * iu * ui + (p3.y - p2.y) * ui * ui);
    const dx = q.x - pts[i].x, dy = q.y - pts[i].y;
    const den = d1x * d1x + d1y * d1y;
    if (den < 1e-12) return ui;
    return Math.min(1, Math.max(0, ui - (dx * d1x + dy * d1y) / den));
  });
}

/* L'erreur n'est mesuree qu'aux echantillons : une courbe qui s'echappe
 * ENTRE deux echantillons leur passe pourtant pres. La boite englobante des
 * points de controle la trahit, et on scinde. */
function sEchappe(pts, courbe, tolerance) {
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const marge = tolerance * 2 + 1;
  for (const p of courbe) {
    if (p.x < x0 - marge || p.x > x1 + marge || p.y < y0 - marge || p.y > y1 + marge) return true;
  }
  return false;
}

/* Un arc dont tous les echantillons tiennent contre sa corde, et dont les
 * tangentes imposees suivent cette corde, EST une droite : on la livre comme
 * telle. Le double critere est necessaire : l'ecart seul accepterait un
 * troncon de tres grand cercle et le facetterait ; l'angle des tangentes
 * l'exclut, puisqu'elles divergent de la corde des que l'arc tourne. Un
 * galbe voulu, lui, depasse l'ecart et reste une courbe. */
function enDroite(pts, tolerance) {
  const n = pts.length;
  const p0 = pts[0], pN = pts[n - 1];
  const cx = pN.x - p0.x, cy = pN.y - p0.y;
  const lc = Math.hypot(cx, cy);
  if (lc < 4 || n < 5) return null;
  const tolLongueur = toleranceDroite(lc);
  const ux = cx / lc, uy = cy / lc;
  // Ecarts signes a la corde, en abscisse reduite s dans [-1, 1].
  const e = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const dx = pts[i].x - p0.x, dy = pts[i].y - p0.y;
    e[i] = dx * uy - dy * ux;
    if (Math.abs(e[i]) > 2.5) return null;
  }
  // Parabole e ~ a + b s + c s2 par moindres carres (base symetrique).
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, y0 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < n; i++) {
    const t = (2 * i / (n - 1)) - 1;
    const t2 = t * t;
    s0 += 1; s1 += t; s2 += t2; s3 += t2 * t; s4 += t2 * t2;
    y0 += e[i]; y1 += e[i] * t; y2 += e[i] * t2;
  }
  // Resolution 3x3 (symetrique) par Cramer.
  const det = s0 * (s2 * s4 - s3 * s3) - s1 * (s1 * s4 - s3 * s2) + s2 * (s1 * s3 - s2 * s2);
  if (Math.abs(det) < 1e-9) return null;
  const a = (y0 * (s2 * s4 - s3 * s3) - s1 * (y1 * s4 - s3 * y2) + s2 * (y1 * s3 - s2 * y2)) / det;
  const b = (s0 * (y1 * s4 - y2 * s3) - y0 * (s1 * s4 - s3 * s2) + s2 * (s1 * y2 - y1 * s2)) / det;
  const c = (s0 * (s2 * y2 - s3 * y1) - s1 * (s1 * y2 - s3 * y0) + y0 * (s1 * s3 - s2 * s2)) / det;
  // La fleche du bombement : la parabole c s2 varie de c entre le centre et
  // les bords de [-1, 1]. Sa limite suit un peu la tolerance en longueur,
  // jamais plus de 0,7 px : une courbure reelle reste une courbe.
  if (Math.abs(c) > Math.min(0.7, FLECHE_DROITE_PX * tolLongueur / ECART_DROITE_PX)) return null;
  // Le bruit residuel, une fois la tendance retiree, reste borne.
  const ecartMax = Math.max(Math.min(tolerance * 0.85, ECART_DROITE_PX), tolLongueur);
  for (let i = 0; i < n; i++) {
    const t = (2 * i / (n - 1)) - 1;
    if (Math.abs(e[i] - (a + b * t + c * t * t)) > ecartMax) return null;
  }
  return { ligne: [p0, pN] };
}

/*
 * LE CHANFREIN DU COIN N'APPARTIENT PAS AU BORD.
 */
const ROGNAGE_COIN_MAX = 2;
const ROGNAGE_PART_MIN = 0.6;
export const PLI_DEG = 150;
const ECARTEMENT_FENETRE = 25;    // echantillons de part et d'autre du coin
const ECARTEMENT_GAIN_MIN = 0.5;  // px gagnes en doublant la fenetre

/*
 * LA DROITE SE POSE SUR TOUS LES ECHANTILLONS, PAS SUR LES DEUX BOUTS.
 *
 * `enDroite` REPOND si l'arc est droit ; la droite qu'elle renvoie passe par
 * les deux extremites, et ces deux la sont justement celles que le chanfrein
 * a deplacees. Sur un carre aux coins arrondis de deux pixels, les deux bouts
 * de chaque cote sont un demi pixel a l'interieur : la remise a l'aplomb, qui
 * moyenne les deux bouts, posait le cote un demi pixel trop bas, et les coins
 * reconstruits par intersection tombaient a cote. Les moindres carres totaux
 * sur TOUS les echantillons ignorent cet effet de bout : soixante seize
 * echantillons plats pesent plus que dix arrondis.
 */
function droiteDesMoindresCarres(pts) {
  let mx = 0, my = 0;
  for (const p of pts) { mx += p.x; my += p.y; }
  mx /= pts.length; my /= pts.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) {
    const dx = p.x - mx, dy = p.y - my;
    sxx += dx * dx; sxy += dx * dy; syy += dy * dy;
  }
  const theta = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const u = { x: Math.cos(theta), y: Math.sin(theta) };
  const proj = (p) => {
    const k = (p.x - mx) * u.x + (p.y - my) * u.y;
    return { x: mx + k * u.x, y: my + k * u.y };
  };
  return { proj, ligne: [proj(pts[0]), proj(pts[pts.length - 1])] };
}

function enDroiteRognee(pts, tolerance, rogner = { debut: true, fin: true },
                        rognageMax = ROGNAGE_COIN_MAX) {
  const n = pts.length;
  // L'ARC ENTIER DROIT NE SE POSE QUE SI SES DEUX BOUTS SONT DES COINS. Un
  // bout de trait fin passe pour une droite : les deux flancs d'un trait d'un
  // pixel tiennent a un demi pixel de leur axe commun, et l'arc qui descend
  // l'un, contourne et remonte l'autre s'ecarte donc moins que la tolerance.
  // Pose en une droite unique, le trait se refermait sur son axe et
  // disparaissait. Quand les deux bouts sont des coins francs, cette
  // confusion est impossible, et poser la droite d'un seul tenant vaut mieux
  // que la segmentation, qui detache les deux chanfreins en micro courbes :
  // ce sont elles qu'on voit onduler au bout d'un bord droit.
  if (rogner.debut && rogner.fin) {
    if (enDroite(pts, tolerance)) {
      return { ligne: remettreALAplomb(droiteDesMoindresCarres(pts).ligne) };
    }
  }
  if (!rogner.debut && !rogner.fin) return null;
  const Ltot = Math.hypot(pts[n - 1].x - pts[0].x, pts[n - 1].y - pts[0].y);
  for (let t = 1; t <= rognageMax; t++) {
    const tD = rogner.debut ? t : 0;
    const tF = rogner.fin ? t : 0;
    if (n - tD - tF < 8) break;
    const milieu = pts.slice(tD, n - tF);
    const Lm = Math.hypot(milieu[milieu.length - 1].x - milieu[0].x,
                          milieu[milieu.length - 1].y - milieu[0].y);
    if (!(Lm >= ROGNAGE_PART_MIN * Ltot)) break;
    if (!enDroite(milieu, tolerance)) continue;
    const { proj } = droiteDesMoindresCarres(milieu);
    return { ligne: remettreALAplomb([proj(pts[0]), proj(pts[n - 1])]) };
  }
  return null;
}

function ajusterArc(pts, t1, t2, tolerance, sortie, profondeur = 0) {
  const droite = enDroite(pts, tolerance);
  if (droite) { sortie.push(droite); return; }
  if (pts.length === 2) {
    const d = norme(soustraire(pts[1], pts[0])) / 3;
    sortie.push([pts[0],
      { x: pts[0].x + t1.x * d, y: pts[0].y + t1.y * d },
      { x: pts[1].x + t2.x * d, y: pts[1].y + t2.y * d },
      pts[1]]);
    return;
  }
  let u = parametrerParCorde(pts);
  let courbe = ajusterCubique(pts, u, t1, t2);
  let { pire, indice } = erreurMax(pts, u, courbe);
  if (pire < tolerance && sEchappe(pts, courbe, tolerance)) {
    pire = tolerance * 100; indice = Math.floor(pts.length / 2);
  }
  if (pire < tolerance) { sortie.push(courbe); return; }
  if (pire < tolerance * 4) {
    for (let k = 0; k < ITERATIONS_REPARAMETRAGE; k++) {
      u = reparametrer(pts, u, courbe);
      courbe = ajusterCubique(pts, u, t1, t2);
      const e = erreurMax(pts, u, courbe);
      pire = e.pire; indice = e.indice;
      if (pire < tolerance && !sEchappe(pts, courbe, tolerance)) { sortie.push(courbe); return; }
    }
  }
  if (profondeur > PROFONDEUR_MAXIMALE || pts.length < 4) { sortie.push(courbe); return; }
  const centre = Math.min(pts.length - 2, Math.max(1, indice));
  const tc = normaliser(soustraire(pts[Math.min(pts.length - 1, centre + 1)], pts[centre - 1]));
  // Convention de Schneider : la tangente d'arrivee pointe vers l'ARRIERE.
  // La premiere moitie recoit donc -tc et la seconde tc : c'est ce partage
  // qui garantit la continuite des tangentes au point de coupe. Inverse,
  // il retourne les poignees et crante chaque jonction, c'est le defaut
  // qu'on corrige ici, il ne doit pas revenir.
  ajusterArc(pts.slice(0, centre + 1), t1, { x: -tc.x, y: -tc.y }, tolerance, sortie, profondeur + 1);
  ajusterArc(pts.slice(centre), tc, t2, tolerance, sortie, profondeur + 1);
}

/*
 * L'ELLIPSE EXACTE. Les pois du logo Fondation, les O, les contre-formes
 * rondes : l'oeil d'un graphiste reconnait un ovale et attend un ovale
 * parfait. Le trace fidele d'un rond de bitmap est legerement patatoide, et
 * ce leger la suffit a faire juger le fichier « pas propre ». Meme principe
 * que les droites : quand une boucle sans coin tient contre une ellipse a
 * la tolerance de mesure pres, on livre l'ellipse, exacte et symetrique.
 * Un galbe qui depasse la tolerance reste trace tel quel : on ne force pas
 * un dessin a etre une ellipse, on reconnait celles qui en sont.
 */
// Tolerance mesuree sur le logo Fondation, 26/08/2026 : ses pois devies par
// la compression tiennent contre leur meilleure ellipse a 1,45 px au pire ;
// les boucles de LETTRES les plus rondes s'en ecartent d'au moins 2,4 px.
// 1,6 se place dans ce vide : tous les pois deviennent des ellipses
// exactes, aucune lettre n'est forcee a en etre une.
export const TOLERANCE_ELLIPSE_PX = 1.6;

function ajusterEllipse(S) {
  const n = S.length;
  if (n < 12) return null;
  let cx = 0, cy = 0;
  for (const p of S) { cx += p.x; cy += p.y; }
  cx /= n; cy /= n;
  let mxx = 0, myy = 0, mxy = 0;
  for (const p of S) {
    const dx = p.x - cx, dy = p.y - cy;
    mxx += dx * dx; myy += dy * dy; mxy += dx * dy;
  }
  mxx /= n; myy /= n; mxy /= n;
  let theta = 0.5 * Math.atan2(2 * mxy, mxx - myy);
  // Echantillonnee a pas d'arc constant, une ellipse a une variance de a2/2
  // sur son grand axe (exact sur le cercle, approche ailleurs) : bon depart.
  let a = Math.sqrt(2 * Math.max(mxx * Math.cos(theta) ** 2 + myy * Math.sin(theta) ** 2 + mxy * Math.sin(2 * theta), 1e-6));
  let b = Math.sqrt(2 * Math.max(mxx * Math.sin(theta) ** 2 + myy * Math.cos(theta) ** 2 - mxy * Math.sin(2 * theta), 1e-6));
  // Gauss-Newton sur (cx, cy, a, b, theta), residu de Sampson : l'ecart
  // algebrique a l'ellipse divise par son gradient approche la distance.
  for (let iter = 0; iter < 12; iter++) {
    const JtJ = [[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0],[0,0,0,0,0]];
    const Jtr = [0,0,0,0,0];
    const ct = Math.cos(theta), st = Math.sin(theta);
    for (const p of S) {
      const dx = p.x - cx, dy = p.y - cy;
      const u = dx * ct + dy * st, v = -dx * st + dy * ct;
      const fu = u / (a * a), fv = v / (b * b);
      const g = Math.hypot(2 * fu * 1, 2 * fv * 1) || 1e-9;
      const f = (u * u) / (a * a) + (v * v) / (b * b) - 1;
      const r = f / g;
      // derivees de f
      const dfdcx = -2 * (fu * ct - fv * st);
      const dfdcy = -2 * (fu * st + fv * ct);
      const dfda = -2 * u * u / (a * a * a);
      const dfdb = -2 * v * v / (b * b * b);
      const dfdt = 2 * fu * v - 2 * fv * u;
      const J = [dfdcx / g, dfdcy / g, dfda / g, dfdb / g, dfdt / g];
      for (let i = 0; i < 5; i++) {
        Jtr[i] += J[i] * r;
        for (let j = 0; j < 5; j++) JtJ[i][j] += J[i] * J[j];
      }
    }
    // resolution 5x5 par elimination de Gauss avec amortissement leger
    for (let i = 0; i < 5; i++) JtJ[i][i] *= 1.001;
    const M = JtJ.map((l, i) => [...l, Jtr[i]]);
    for (let col = 0; col < 5; col++) {
      let piv = col;
      for (let l = col + 1; l < 5; l++) if (Math.abs(M[l][col]) > Math.abs(M[piv][col])) piv = l;
      if (Math.abs(M[piv][col]) < 1e-12) return null;
      [M[col], M[piv]] = [M[piv], M[col]];
      for (let l = 0; l < 5; l++) {
        if (l === col) continue;
        const k = M[l][col] / M[col][col];
        for (let c = col; c < 6; c++) M[l][c] -= k * M[col][c];
      }
    }
    const delta = M.map((l, i) => l[5] / l[i]);
    cx -= delta[0]; cy -= delta[1]; a -= delta[2]; b -= delta[3]; theta -= delta[4];
    if (!(a > 0.5) || !(b > 0.5)) return null;
    if (Math.max(...delta.map(Math.abs)) < 1e-4) break;
  }
  // Une ellipse tres allongee sait epouser un TRAIT : sur un trait de 3 px
  // sur 200, l'ellipse de grand axe 100 et de petit axe 1,5 tient partout
  // sous la tolerance, et le trait sortait en fuseau pointu. Mesure :
  // trait_03px tombait a 73,7 pour cent de recouvrement. Un pois, un O, une
  // contre-forme ronde n'ont jamais ce rapport : on borne l'allongement.
  if (Math.max(a, b) > 3 * Math.min(a, b)) return null;
  // Acceptation en deux temps. L'ecart maximal borne le bruit. Et une SUITE
  // d'echantillons du meme cote est une bosse dessinee, pas du bruit : le
  // bruit alterne, un galbe insiste. Sans ce second critere, une bosse de
  // 3 px se fondait dans la tolerance et le haricot devenait une ellipse.
  // ET LA BOUCLE DOIT FAIRE LE TOUR DE L'ELLIPSE QU'ELLE PRETEND ETRE.
  //
  // La lecon du 26/08/2026, sur le logo Pelican : un COPEAU, une boucle fine
  // et legerement courbe comme un trait de hachure, a ses deux bords sur la
  // meme courbe. Une ellipse enorme passant par ce copeau reste a moins de
  // deux pixels de tous ses points, et l'allongement d'un cercle vaut un :
  // les deux gardes precedentes la laissaient passer. Le copeau ressortait en
  // disque noir de cent pixels au milieu du dessin.
  //
  // Une boucle qui EST une ellipse en fait le tour : vue du centre, ses points
  // couvrent les trois cent soixante degres sans trou. Un copeau, lui, tient
  // dans un secteur etroit. On mesure donc le plus grand vide angulaire, dans
  // le repere de l'ellipse ou elle devient un cercle, et on refuse au dela
  // d'un sixieme de tour.
  {
    const cta = Math.cos(theta), sta = Math.sin(theta);
    const angles = [];
    for (const p of S) {
      const dx = p.x - cx, dy = p.y - cy;
      angles.push(Math.atan2((-dx * sta + dy * cta) / b, (dx * cta + dy * sta) / a));
    }
    angles.sort((u, v) => u - v);
    let vide = angles[0] + 2 * Math.PI - angles[angles.length - 1];
    for (let i = 1; i < angles.length; i++) {
      const e = angles[i] - angles[i - 1];
      if (e > vide) vide = e;
    }
    if (vide > Math.PI / 3) return null;
  }

  const ct = Math.cos(theta), st = Math.sin(theta);
  let suitePos = 0, suiteNeg = 0;
  for (const p of S) {
    const dx = p.x - cx, dy = p.y - cy;
    const u = dx * ct + dy * st, v = -dx * st + dy * ct;
    const f = (u * u) / (a * a) + (v * v) / (b * b) - 1;
    const g = Math.hypot(2 * u / (a * a), 2 * v / (b * b)) || 1e-9;
    const e = f / g;
    if (Math.abs(e) > TOLERANCE_ELLIPSE_PX) return null;
    if (e > 0.9) { suitePos++; suiteNeg = 0; }
    else if (e < -0.9) { suiteNeg++; suitePos = 0; }
    else { suitePos = 0; suiteNeg = 0; }
    if (suitePos >= 5 || suiteNeg >= 5) return null;
  }
  return { cx, cy, a, b, theta };
}

/* Les quatre cubiques d'une ellipse exacte, dans le sens de la boucle. */
function segmentsEllipse(e, sens) {
  const k = 0.5522847498;
  const { cx, cy, a, b, theta } = e;
  const ct = Math.cos(theta), st = Math.sin(theta);
  const M = (u, v) => ({ x: cx + u * ct - v * st, y: cy + u * st + v * ct });
  let quarts = [
    [M(a, 0), M(a, k * b), M(k * a, b), M(0, b)],
    [M(0, b), M(-k * a, b), M(-a, k * b), M(-a, 0)],
    [M(-a, 0), M(-a, -k * b), M(-k * a, -b), M(0, -b)],
    [M(0, -b), M(k * a, -b), M(a, -k * b), M(a, 0)],
  ];
  if (sens < 0) quarts = quarts.map((q) => [...q].reverse()).reverse();
  const segments = [{ type: 'depart', x: quarts[0][0].x, y: quarts[0][0].y }];
  for (const [, p1, p2, p3] of quarts) {
    segments.push({ type: 'courbe', x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, x: p3.x, y: p3.y });
  }
  return segments;
}

function sensDeBoucle(S) {
  let aire = 0;
  for (let i = 0; i < S.length; i++) {
    const p = S[i], q = S[(i + 1) % S.length];
    aire += p.x * q.y - q.x * p.y;
  }
  return aire >= 0 ? 1 : -1;
}

/*
 * SEGMENTATION PAR COURBURE. Le C a flancs plats du logo Chicago l'a
 * montre : entre deux coins, une seule cubique enjambe le flanc droit ET
 * l'arrondi, et elle bombe d'un pixel sur le flanc, dans la tolerance mais
 * sous l'oeil. Un arc se decoupe donc d'abord en zones DROITES, ou le
 * virage local reste sous quelques degres de facon soutenue, et en zones
 * COURBES. Les droites sont posees en premier, remises a l'aplomb quand
 * elles y sont presque ; les courbes s'ajustent ensuite ENTRE les droites,
 * en heritant leur direction au raccord : la transition reste tangente.
 */
const VIRAGE_DROIT_DEG = 6;      // sous ce virage local (fenetre 8), on est droit
const FENETRE_COURBURE = 8;      // demi-fenetre des cordes de courbure
const RUN_DROIT_MIN = 9;         // echantillons minimum d'une zone droite
const RUN_COURBE_MIN = 4;        // en dessous, une zone courbe rejoint les droites

/* Remet une droite a l'aplomb quand elle y est presque. */
function remettreALAplomb(ligne) {
  let [p0, pN] = ligne;
  const L = Math.hypot(pN.x - p0.x, pN.y - p0.y);
  if (L >= APLOMB_LONGUEUR_MIN_PX) {
    const ang = Math.atan2(pN.y - p0.y, pN.x - p0.x) * 180 / Math.PI;
    const mod = ((ang % 180) + 180) % 180;
    const mx = (p0.x + pN.x) / 2, my = (p0.y + pN.y) / 2;
    if (Math.abs(mod - 90) <= APLOMB_DEG) {
      const demi = (pN.y - p0.y) >= 0 ? L / 2 : -L / 2;
      p0 = { x: mx, y: my - demi }; pN = { x: mx, y: my + demi };
    } else if (mod <= APLOMB_DEG || mod >= 180 - APLOMB_DEG) {
      const demi = (pN.x - p0.x) >= 0 ? L / 2 : -L / 2;
      p0 = { x: mx - demi, y: my }; pN = { x: mx + demi, y: my };
    }
  }
  return [p0, pN];
}

/* Valide une droite et la remet a l'aplomb si elle y est presque. */
function poserDroite(morceau, tolerance) {
  const d = enDroite(morceau, tolerance);
  if (!d) return null;
  return { ligne: remettreALAplomb(d.ligne) };
}

function segmenterEtAjuster(arc, t1, t2, tolerance, sortie) {
  const n = arc.length;
  if (n < 2 * FENETRE_COURBURE + 4) { ajusterArc(arc, t1, t2, tolerance, sortie); return; }
  // virage local par cordes encadrantes, bornees a l'arc (pas de bouclage)
  const droit = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const g = Math.max(0, i - FENETRE_COURBURE), d = Math.min(n - 1, i + FENETRE_COURBURE);
    const av = soustraire(arc[i], arc[g]), ap = soustraire(arc[d], arc[i]);
    const na = norme(av), nb = norme(ap);
    if (!na || !nb) { droit[i] = 0; continue; }
    let c = (av.x * ap.x + av.y * ap.y) / (na * nb);
    c = Math.max(-1, Math.min(1, c));
    droit[i] = (Math.acos(c) * 180 / Math.PI) < VIRAGE_DROIT_DEG ? 1 : 0;
  }
  // nettoyage des labels : les zones trop courtes basculent
  const runs = [];
  let debut = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || droit[i] !== droit[debut]) { runs.push([debut, i - 1, droit[debut]]); debut = i; }
  }
  for (const r of runs) {
    const long = r[1] - r[0] + 1;
    if (r[2] === 1 && long < RUN_DROIT_MIN) r[2] = 0;
  }
  // fusion des runs adjacents de meme label
  const fusion = [];
  for (const r of runs) {
    const dernier = fusion[fusion.length - 1];
    if (dernier && dernier[2] === r[2]) dernier[1] = r[1];
    else fusion.push([...r]);
  }
  for (const r of fusion) {
    const long = r[1] - r[0] + 1;
    if (r[2] === 0 && long < RUN_COURBE_MIN && fusion.length > 1) r[2] = 1;
  }
  const zones = [];
  for (const r of fusion) {
    const dernier = zones[zones.length - 1];
    if (dernier && dernier[2] === r[2]) dernier[1] = r[1];
    else zones.push([...r]);
  }
  if (zones.length === 1) {
    // tout droit : une seule droite, remise a l'aplomb ; tout courbe : le
    // chemin classique sait faire
    if (zones[0][2] === 1) {
      const d = poserDroite(arc, tolerance * 2.5);
      if (d) { sortie.push(d); return; }
    }
    ajusterArc(arc, t1, t2, tolerance, sortie);
    return;
  }
  // PASSE 1 : les droites, validees et posees (aplomb compris)
  const primitives = new Array(zones.length).fill(null);
  for (let z = 0; z < zones.length; z++) {
    if (zones[z][2] !== 1) continue;
    const d = poserDroite(arc.slice(zones[z][0], zones[z][1] + 1), tolerance * 2.5);
    if (!d) { zones[z][2] = 0; continue; }
    primitives[z] = d;
  }
  // refusion : des zones redevenues courbes peuvent se toucher
  // PASSE 2 : les courbes, ajustees entre les extremites FIXES des droites
  for (let z = 0; z < zones.length; z++) {
    if (zones[z][2] === 1 && primitives[z]) continue;
    // etendre la zone courbe sur les voisines redevenues courbes
    let z2 = z;
    while (z2 + 1 < zones.length && (zones[z2 + 1][2] !== 1 || !primitives[z2 + 1])) z2++;
    const morceau = arc.slice(zones[z][0], zones[z2][1] + 1);
    const avant = z > 0 ? primitives[z - 1] : null;
    const apres = z2 + 1 < zones.length ? primitives[z2 + 1] : null;
    if (avant) morceau[0] = avant.ligne[1];
    if (apres) morceau[morceau.length - 1] = apres.ligne[0];
    const tD = avant
      ? normaliser(soustraire(avant.ligne[1], avant.ligne[0]))
      : t1;
    const tF = apres
      ? normaliser(soustraire(apres.ligne[0], apres.ligne[1]))
      : t2;
    const sortieZone = [];
    ajusterArc(morceau, tD, tF, tolerance, sortieZone);
    primitives[z] = { paquets: sortieZone };
    for (let k = z + 1; k <= z2; k++) primitives[k] = { vide: true };
    z = z2;
  }
  for (const p of primitives) {
    if (!p || p.vide) continue;
    if (p.paquets) sortie.push(...p.paquets);
    else sortie.push(p);
  }
}

function tangenteCentrale(S, i) {
  const n = S.length;
  return normaliser(soustraire(S[(i + 1) % n], S[(i - 1 + n) % n]));
}

/**
 * Boucle fermee de sommets -> segments du programme (depart + courbes).
 * Renvoie null si la boucle est trop courte pour etre ajustee : elle reste
 * alors telle quelle.
 */
export function lisserBoucle(pts, options = {}) {
  const seuilCoin = options.seuilCoin ?? SEUIL_COIN_DEG;
  const tolerance = options.tolerance ?? TOLERANCE_AJUSTEMENT_PX;
  const S0 = reechantillonner(pts, options.pas ?? PAS_ECHANTILLON_PX);
  if (!S0) return null;
  // L'ellipse s'essaie AVANT les coins : une asperite de compression peut
  // faire naitre un coin fantome sur un pois, et ce faux coin interdisait
  // ensuite l'ellipse. Si toutes les positions de la boucle tiennent contre
  // une ellipse a la tolerance pres, ce que le detecteur a pris pour un coin
  // n'etait pas un coin : a la resolution de notre mesure, cette boucle EST
  // une ellipse. Une vraie entaille, elle, sort de l'ellipse et la refuse.
  const ellipse = ajusterEllipse(S0);
  if (ellipse) return segmentsEllipse(ellipse, sensDeBoucle(S0));
  const coins = detecterCoins(S0, options.fenetreCoin ?? FENETRE_COIN, seuilCoin);
  const S = lisserPoints(S0, coins, options.rayonLissage ?? RAYON_LISSAGE);
  const n = S.length;
  const courbes = [];
  const liste = coins.slice().sort((a, b) => a - b);
  if (liste.length === 1) {
    // Un seul coin : la boucle se coupe au coin et au point oppose, sinon
    // un arc unique devrait se refermer sur lui meme.
    liste.push((liste[0] + Math.floor(n / 2)) % n);
    liste.sort((a, b) => a - b);
  }
  if (liste.length === 0) {
    // Boucle entierement lisse et pourtant pas une ellipse : deux arcs,
    // tangentes centrales partagees aux deux points de couture, la boucle
    // reste G1 partout.
    const moitie = Math.floor(n / 2);
    const t0 = tangenteCentrale(S, 0);
    const tm = tangenteCentrale(S, moitie);
    segmenterEtAjuster(S.slice(0, moitie + 1), t0, { x: -tm.x, y: -tm.y }, tolerance, courbes);
    segmenterEtAjuster(S.slice(moitie).concat([S[0]]), tm, { x: -t0.x, y: -t0.y }, tolerance, courbes);
  } else {
    // Chaque arc garde sa propre liste : les jonctions entre arcs sont les
    // COINS, et ils recoivent un traitement propre apres l'ajustement.
    // LE PLI D'UN BOUT DE TRAIT N'EST PAS UN COIN DE DESSIN. Aux deux bouts
    // d'un trait fin, le chemin fait DEMI TOUR : le detecteur y voit un coin,
    // a juste titre, mais ce coin la ne borde pas deux bords qui se croisent,
    // il referme un trait sur lui meme. Rogner de ce cote la retirerait le
    // bout du trait au lieu d'un chanfrein, et les deux flancs, devenus deux
    // droites opposees, se souderaient sur leur axe : le trait disparaissait.
    // Mesure prise sur les echantillons, pas sur les primitives, parce qu'il
    // faut la connaitre AVANT de choisir la primitive.
    const coinFranc = (c) => {
      const k = 8;
      const a = normaliser(soustraire(S[c], S[(c - k + n) % n]));
      const b = normaliser(soustraire(S[(c + k) % n], S[c]));
      let cos = a.x * b.x + a.y * b.y;
      cos = Math.max(-1, Math.min(1, cos));
      const virage = Math.acos(cos) * 180 / Math.PI;
      if (virage < PLI_DEG) return true;
      // PRESQUE UN DEMI TOUR : POINTE AIGUE, OU BOUT DE TRAIT ? Les deux se
      // ressemblent a la loupe et se separent en s'eloignant. Les deux bords
      // d'une pointe DIVERGENT : deux fois plus loin du sommet, ils sont deux
      // fois plus ecartes. Les deux flancs d'un trait restent a la meme
      // distance, quelle que soit la fenetre. C'est la meme distinction que
      // fait deja l'effacement des micro-arcs de chanfrein, mesuree ici sur
      // les echantillons parce qu'il faut la connaitre AVANT la primitive.
      const W = ECARTEMENT_FENETRE;
      if (n < 4 * W) return false;
      const ecart = (w) => norme(soustraire(S[(c - w + n) % n], S[(c + w) % n]));
      return ecart(2 * W) - ecart(W) > ECARTEMENT_GAIN_MIN;
    };
    const arcs = [];
    for (let k = 0; k < liste.length; k++) {
      const debut = liste[k], fin = liste[(k + 1) % liste.length];
      const arc = [S[debut]];
      for (let i = (debut + 1) % n; ; i = (i + 1) % n) { arc.push(S[i]); if (i === fin) break; }
      if (arc.length < 2) continue;
      // Aux coins, les tangentes sont unilaterales : le coin reste un coin.
      // Elles se mesurent sur une corde de quelques pas, pas sur le premier
      // pas seul : un echantillon voisin qui porte un demi pixel de bruit
      // fait tourner une corde de 1 px de 17 degres, et une tangente fausse
      // au depart d'un bord droit interdisait de le reconnaitre droit.
      const base = Math.min(3, arc.length - 1);
      const t1 = normaliser(soustraire(arc[base], arc[0]));
      const t2 = normaliser(soustraire(arc[arc.length - 1 - base], arc[arc.length - 1]));
      const sortie = [];
      const droite = enDroiteRognee(arc, tolerance,
        { debut: coinFranc(debut), fin: coinFranc(fin) });
      if (droite) sortie.push(droite);
      else segmenterEtAjuster(arc, t1, t2, tolerance, sortie);
      if (sortie.length) arcs.push(sortie);
    }
    // LES MICRO-ARCS DE CHANFREIN S'EFFACENT D'ABORD : un chanfrein de deux
    // pixels entre deux coins est la trace de l'antialiasing, pas un bord du
    // dessin. On ne retire un micro-arc QUE si les deux bords voisins se
    // croisent tout pres de lui : c'est la signature du coin emousse. Le
    // bout d'un trait fin, lui, separe deux bords PARALLELES qui ne se
    // croisent nulle part : il reste. Sans cette garde, trait_03px tombait
    // de 99,2 a 73,6 pour cent, les bouts de traits se pincaient.
    if (arcs.length > 2) {
      const finDir = (A) => {
        const f = A[A.length - 1];
        const d = f.ligne ? soustraire(f.ligne[1], f.ligne[0]) : soustraire(f[3], f[2]);
        const l = norme(d);
        return l ? { x: d.x / l, y: d.y / l } : null;
      };
      const debutDir = (B) => {
        const f = B[0];
        const d = f.ligne ? soustraire(f.ligne[1], f.ligne[0]) : soustraire(f[1], f[0]);
        const l = norme(d);
        return l ? { x: d.x / l, y: d.y / l } : null;
      };
      const finPt = (A) => { const f = A[A.length - 1]; return f.ligne ? f.ligne[1] : f[3]; };
      const debutPt = (B) => { const f = B[0]; return f.ligne ? f.ligne[0] : f[0]; };
      for (let k = arcs.length - 1; k >= 0 && arcs.length > 2; k--) {
        let longueur = 0;
        for (const p of arcs[k]) {
          if (p.ligne) longueur += Math.hypot(p.ligne[1].x - p.ligne[0].x, p.ligne[1].y - p.ligne[0].y);
          else longueur += Math.hypot(p[3].x - p[0].x, p[3].y - p[0].y);
        }
        if (longueur >= 3.5) continue;
        const avant = arcs[(k - 1 + arcs.length) % arcs.length];
        const apres = arcs[(k + 1) % arcs.length];
        const dA = finDir(avant), dB = debutDir(apres);
        if (!dA || !dB) continue;
        const det = dA.x * dB.y - dA.y * dB.x;
        if (Math.abs(det) < 0.17) continue; // bords presque paralleles : bout de trait, on garde
        const pA = finPt(avant), pB = debutPt(apres);
        const rx = pB.x - pA.x, ry = pB.y - pA.y;
        const t = (rx * dB.y - ry * dB.x) / det;
        const P = { x: pA.x + t * dA.x, y: pA.y + t * dA.y };
        const centre = debutPt(arcs[k]);
        if (Math.hypot(P.x - centre.x, P.y - centre.y) > 3.5) continue;
        arcs.splice(k, 1);
      }
    }
    // LES COINS SE RECONSTRUISENT PAR INTERSECTION. Un coin pixelise est
    // toujours EMOUSSE : l'antialiasing mange une a deux longueurs de pixel
    // a la pointe, et l'echantillon de coin se pose sur ce chanfrein. Le
    // vrai coin du dessin est a l'intersection des deux bords qui s'y
    // rencontrent : on prolonge chacun le long de sa tangente et on pose le
    // coin la ou ils se croisent. C'est ce que fait un graphiste, et c'est
    // ce que l'oeil attend d'une pointe.
    for (let k = 0; k < arcs.length; k++) {
      const A = arcs[k], B = arcs[(k + 1) % arcs.length];
      const finA = A[A.length - 1], debB = B[0];
      const pA = finA.ligne ? finA.ligne[1] : finA[3];
      const pB = debB.ligne ? debB.ligne[0] : debB[0];
      let dA = finA.ligne ? soustraire(finA.ligne[1], finA.ligne[0]) : soustraire(finA[3], finA[2]);
      if (!norme(dA) && !finA.ligne) dA = soustraire(finA[3], finA[1]);
      let dB = debB.ligne ? soustraire(debB.ligne[1], debB.ligne[0]) : soustraire(debB[1], debB[0]);
      if (!norme(dB) && !debB.ligne) dB = soustraire(debB[2], debB[0]);
      const na = norme(dA), nb = norme(dB);
      if (!na || !nb) continue;
      dA = { x: dA.x / na, y: dA.y / na };
      dB = { x: dB.x / nb, y: dB.y / nb };
      let cos = dA.x * dB.x + dA.y * dB.y;
      cos = Math.max(-1, Math.min(1, cos));
      const virage = Math.acos(cos) * 180 / Math.PI;
      // Si la reconstruction renonce, on SOUDE quand meme : la remise a
      // l'aplomb a pu ecarter les deux bouts, et un trou dans le chemin est
      // pire que tout.
      const souder = () => {
        if (pA.x === pB.x && pA.y === pB.y) return;
        const M = { x: (pA.x + pB.x) / 2, y: (pA.y + pB.y) / 2 };
        if (finA.ligne) finA.ligne[1] = M;
        else { const d = { x: M.x - finA[3].x, y: M.y - finA[3].y }; finA[3] = M; finA[2] = { x: finA[2].x + d.x, y: finA[2].y + d.y }; }
        if (debB.ligne) debB.ligne[0] = M;
        else { const d = { x: M.x - debB[0].x, y: M.y - debB[0].y }; debB[0] = M; debB[1] = { x: debB[1].x + d.x, y: debB[1].y + d.y }; }
      };
      if (virage < 20 || virage > 160) { souder(); continue; }
      const det = dA.x * dB.y - dA.y * dB.x;
      if (Math.abs(det) < 1e-6) { souder(); continue; }
      // pA + t dA = pB + s dB
      const rx = pB.x - pA.x, ry = pB.y - pA.y;
      const t = (rx * dB.y - ry * dB.x) / det;
      const P = { x: pA.x + t * dA.x, y: pA.y + t * dA.y };
      if (Math.hypot(P.x - pA.x, P.y - pA.y) > 3.5 || Math.hypot(P.x - pB.x, P.y - pB.y) > 3.5) { souder(); continue; }
      if (finA.ligne) finA.ligne[1] = P;
      else { const d = { x: P.x - finA[3].x, y: P.y - finA[3].y }; finA[3] = P; finA[2] = { x: finA[2].x + d.x, y: finA[2].y + d.y }; }
      if (debB.ligne) debB.ligne[0] = P;
      else { const d = { x: P.x - debB[0].x, y: P.y - debB[0].y }; debB[0] = P; debB[1] = { x: debB[1].x + d.x, y: debB[1].y + d.y }; }
    }
    for (const arc of arcs) courbes.push(...arc);
  }
  if (courbes.length === 0) return null;
  const premier = courbes[0].ligne ? courbes[0].ligne[0] : courbes[0][0];
  const segments = [{ type: 'depart', x: premier.x, y: premier.y }];
  for (const c of courbes) {
    if (c.ligne) segments.push({ type: 'ligne', x: c.ligne[1].x, y: c.ligne[1].y });
    else segments.push({ type: 'courbe', x1: c[1].x, y1: c[1].y, x2: c[2].x, y2: c[2].y, x: c[3].x, y: c[3].y });
  }
  return segments;
}

/**
 * Ajuste toutes les boucles polygonales d'un programme, en place. Les
 * sous-chemins qui portent deja des courbes ne sont pas touches : ce module
 * ajuste un trace pixel, il ne relisse pas un lissage.
 */
export function lisserProgramme(programme, options = {}) {
  for (const forme of programme.formes) {
    forme.sousChemins = forme.sousChemins.map((sc) => {
      const pts = [];
      for (const s of sc.segments) {
        if (s.x === undefined) continue;
        if (s.type === 'courbe') return sc;
        const dernier = pts[pts.length - 1];
        if (!dernier || dernier.x !== s.x || dernier.y !== s.y) pts.push({ x: s.x, y: s.y });
      }
      if (pts.length > 1 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y) pts.pop();
      const segments = lisserBoucle(pts, options);
      return segments ? { ...sc, segments } : sc;
    });
  }
  return programme;
}
