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
  for (let i = 0; i < n; i++) {
    if (angles[i] <= seuilDeg) continue;
    let max = true;
    for (let d = -rayonSuppression; d <= rayonSuppression && max; d++) {
      const j = (i + d + n) % n;
      if (angles[j] > angles[i] || (angles[j] === angles[i] && j < i && d !== 0)) max = false;
    }
    if (max) coins.push(i);
  }
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
  // les bords de [-1, 1].
  if (Math.abs(c) > FLECHE_DROITE_PX) return null;
  // Le bruit residuel, une fois la tendance retiree, reste borne.
  const ecartMax = Math.min(tolerance * 0.85, ECART_DROITE_PX);
  for (let i = 0; i < n; i++) {
    const t = (2 * i / (n - 1)) - 1;
    if (Math.abs(e[i] - (a + b * t + c * t * t)) > ecartMax) return null;
  }
  return { ligne: [p0, pN] };
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
    ajusterArc(S.slice(0, moitie + 1), t0, { x: -tm.x, y: -tm.y }, tolerance, courbes);
    ajusterArc(S.slice(moitie).concat([S[0]]), tm, { x: -t0.x, y: -t0.y }, tolerance, courbes);
  } else {
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
      ajusterArc(arc, t1, t2, tolerance, courbes);
    }
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
