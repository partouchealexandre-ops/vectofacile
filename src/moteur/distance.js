/**
 * Transformee de distance euclidienne EXACTE, algorithme de Felzenszwalb et
 * Huttenlocher (2012), en O(n) par ligne puis par colonne.
 *
 * Pourquoi l'exacte et pas un chanfrein 3-4 ou 5-7-11 : les resultats de ce
 * module sont convertis en millimetres et compares a des seuils de fabricant.
 * Un chanfrein se trompe de 2 a 8 pour cent selon l'orientation du trait. Sur
 * un seuil de 0,20 mm, 8 pour cent font 0,016 mm, ce qui est deja plus que
 * l'ecart entre deux valeurs sourcees voisines du referentiel. On ne peut pas
 * se permettre une erreur d'algorithme qui vaut une contradiction de source.
 *
 * Convention de distance retenue dans tout le moteur :
 *   d(p) = distance euclidienne du CENTRE du pixel p au CENTRE du pixel de
 *   fond le plus proche.
 * Un pixel d'encre colle au fond a donc d = 1, et non d = 0,5.
 * Consequence assumee et documentee dans mesures.js : une epaisseur paire est
 * lue a un pixel pres. Le moteur rend un encadrement, jamais une fausse
 * precision.
 */

const INFINI = 1e20;

/**
 * Transformee de distance 1D au carre. f est le cout initial par position.
 * Retourne un Float64Array des distances au carre.
 */
function distance1d(f, n, sortie, v, z) {
  let k = 0;
  v[0] = 0;
  z[0] = -INFINI;
  z[1] = INFINI;

  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {
      k--;
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    }
    k++;
    v[k] = q;
    z[k] = s;
    z[k + 1] = INFINI;
  }

  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    const ecart = q - v[k];
    sortie[q] = ecart * ecart + f[v[k]];
  }
}

/**
 * Distance euclidienne de chaque pixel au pixel de graine le plus proche.
 *
 * @param {Uint8Array} graines  1 sur les pixels de graine (distance 0), 0 ailleurs
 * @param {number} largeur
 * @param {number} hauteur
 * @returns {Float64Array} distance (pas le carre) de longueur largeur x hauteur
 */
export function transformeeDistance(graines, largeur, hauteur) {
  const n = largeur * hauteur;
  const carre = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    carre[i] = graines[i] ? 0 : INFINI;
  }

  const maxDim = Math.max(largeur, hauteur);
  const f = new Float64Array(maxDim);
  const sortie = new Float64Array(maxDim);
  const v = new Int32Array(maxDim);
  const z = new Float64Array(maxDim + 1);

  // Passe colonnes.
  for (let x = 0; x < largeur; x++) {
    for (let y = 0; y < hauteur; y++) f[y] = carre[y * largeur + x];
    distance1d(f, hauteur, sortie, v, z);
    for (let y = 0; y < hauteur; y++) carre[y * largeur + x] = sortie[y];
  }

  // Passe lignes.
  for (let y = 0; y < hauteur; y++) {
    const base = y * largeur;
    for (let x = 0; x < largeur; x++) f[x] = carre[base + x];
    distance1d(f, largeur, sortie, v, z);
    for (let x = 0; x < largeur; x++) carre[base + x] = sortie[x];
  }

  const distance = new Float64Array(n);
  for (let i = 0; i < n; i++) distance[i] = Math.sqrt(carre[i]);
  return distance;
}

/**
 * Points de crete d'une carte de distance : un pixel dont la distance est
 * superieure ou egale a celle de ses huit voisins. C'est l'axe median discret.
 *
 * @param {Float64Array} distance
 * @param {Uint8Array} zone  1 sur les pixels ou la crete a un sens
 * @returns {number[]} indices des points de crete
 */
export function pointsDeCrete(distance, zone, largeur, hauteur) {
  const cretes = [];
  for (let y = 0; y < hauteur; y++) {
    for (let x = 0; x < largeur; x++) {
      const i = y * largeur + x;
      if (!zone[i]) continue;
      const d = distance[i];
      if (d <= 0) continue;
      let maximal = true;
      for (let dy = -1; dy <= 1 && maximal; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= hauteur) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const xx = x + dx;
          if (xx < 0 || xx >= largeur) continue;
          if (distance[yy * largeur + xx] > d) { maximal = false; break; }
        }
      }
      if (maximal) cretes.push(i);
    }
  }
  return cretes;
}

/**
 * Le disque inscrit au point i touche t il sa cible sur deux directions
 * franchement opposees ?
 *
 * C'est le critere central du moteur, et il sert DEUX FOIS, dans les deux sens.
 *   Pour M5, un trait est de l'encre coincee entre deux fonds opposes.
 *   Pour M6, un ecart est du fond coince entre deux encres opposees.
 *
 * Sans lui, la mesure du trait le plus fin est fausse sur toute forme a angle.
 * L'axe median d'un carre comprend ses quatre diagonales, qui rejoignent les
 * coins : un carre de 100 px porte donc des points de crete a distance 2, et un
 * minimum naif rendrait "trait de 3 px" pour un aplat de 100 px de cote. Au
 * coin, les deux contacts du disque sont separes de l'angle du coin, 90 degres.
 * Dans une vraie barre, ils sont a 180. Le seuil se pose entre les deux.
 */
export function cotesOpposes(i, rayon, cible, largeur, hauteur, angleMinimal = 120, echantillons = 16) {
  const x = i % largeur;
  const y = (i / largeur) | 0;
  const r = Math.max(1, Math.round(rayon));
  const touches = [];
  for (let k = 0; k < echantillons; k++) {
    const angle = (2 * Math.PI * k) / echantillons;
    const xx = Math.round(x + r * Math.cos(angle));
    const yy = Math.round(y + r * Math.sin(angle));
    if (xx < 0 || yy < 0 || xx >= largeur || yy >= hauteur) {
      // Hors image : on considere que la cible y est, sinon un logo colle au
      // bord du fichier verrait ses traits de bord disparaitre de la mesure.
      touches.push((360 * k) / echantillons);
      continue;
    }
    if (cible[yy * largeur + xx]) touches.push((360 * k) / echantillons);
  }
  for (let a = 0; a < touches.length; a++) {
    for (let b = a + 1; b < touches.length; b++) {
      let ecart = Math.abs(touches[a] - touches[b]);
      if (ecart > 180) ecart = 360 - ecart;
      if (ecart >= angleMinimal) return true;
    }
  }
  return false;
}
