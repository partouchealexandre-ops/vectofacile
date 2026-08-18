/**
 * Lecture des donnees de chemin SVG, l'attribut d, vers des segments absolus.
 *
 * Le moteur de rendu du navigateur sait lire un chemin SVG. Une presse a
 * marquer, non : elle veut un EPS ou un PDF. Il faut donc traduire, et traduire
 * suppose d'abord comprendre. Ce module ne dessine rien, il normalise :
 * toutes les commandes deviennent absolues, les raccourcis sont developpes, les
 * quadratiques sont elevees en cubiques. La sortie ne contient plus que quatre
 * choses : aller a, ligne vers, courbe cubique vers, fermer.
 *
 * Les arcs elliptiques ne sont PAS traites, et c'est volontaire. VTracer n'en
 * produit pas. Plutot que d'en fabriquer une approximation qui deformerait
 * silencieusement un logo client, on leve une erreur nommee. Un fichier qui
 * refuse de sortir vaut mieux qu'un fichier faux qui part chez le marqueur.
 */

export class CheminNonSupporte extends Error {}

const NOMBRE = /[+-]?(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?/g;

function lireNombres(texte) {
  const trouves = texte.match(NOMBRE);
  return trouves ? trouves.map(Number) : [];
}

/**
 * @param {string} d
 * @returns {Array<{ferme: boolean, segments: Array}>} sous chemins
 */
export function lireChemin(d) {
  const jetons = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g);
  if (!jetons) return [];

  const sousChemins = [];
  let courant = null;
  let x = 0, y = 0;          // point courant
  let dx = 0, dy = 0;        // depart du sous chemin
  let cx = null, cy = null;  // dernier point de controle cubique
  let qx = null, qy = null;  // dernier point de controle quadratique

  const ouvrir = () => {
    courant = { ferme: false, segments: [] };
    sousChemins.push(courant);
  };
  const ajouter = (segment) => {
    if (!courant) {
      // Cas paye a Ghostscript, garde ici. Apres un Z, le SVG autorise une
      // commande de trace SANS nouveau M : le sous chemin suivant repart du
      // point de depart du sous chemin ferme. Sans ce depart implicite, le
      // PostScript emis commencait par un lineto sans point courant, et
      // Ghostscript rendait "nocurrentpoint in --lineto--". Le fichier livre
      // etait inouvrable, et le SVG, lui, s'affichait tres bien : c'est
      // exactement le genre de faute qu'aucun apercu navigateur ne montre.
      ouvrir();
      courant.segments.push({ type: 'depart', x, y });
    }
    courant.segments.push(segment);
  };

  for (const jeton of jetons) {
    const commande = jeton[0];
    const n = lireNombres(jeton.slice(1));
    const relatif = commande === commande.toLowerCase();
    const majuscule = commande.toUpperCase();

    switch (majuscule) {
      case 'M': {
        if (n.length < 2 || n.length % 2 !== 0) throw new CheminNonSupporte(`M mal forme : ${jeton}`);
        for (let i = 0; i < n.length; i += 2) {
          const nx = relatif ? x + n[i] : n[i];
          const ny = relatif ? y + n[i + 1] : n[i + 1];
          if (i === 0) {
            ouvrir();
            courant.segments.push({ type: 'depart', x: nx, y: ny });
            dx = nx; dy = ny;
          } else {
            ajouter({ type: 'ligne', x: nx, y: ny });
          }
          x = nx; y = ny;
        }
        cx = cy = qx = qy = null;
        break;
      }
      case 'L': {
        for (let i = 0; i < n.length; i += 2) {
          x = relatif ? x + n[i] : n[i];
          y = relatif ? y + n[i + 1] : n[i + 1];
          ajouter({ type: 'ligne', x, y });
        }
        cx = cy = qx = qy = null;
        break;
      }
      case 'H': {
        for (const v of n) { x = relatif ? x + v : v; ajouter({ type: 'ligne', x, y }); }
        cx = cy = qx = qy = null;
        break;
      }
      case 'V': {
        for (const v of n) { y = relatif ? y + v : v; ajouter({ type: 'ligne', x, y }); }
        cx = cy = qx = qy = null;
        break;
      }
      case 'C': {
        for (let i = 0; i + 5 < n.length; i += 6) {
          const x1 = relatif ? x + n[i] : n[i];
          const y1 = relatif ? y + n[i + 1] : n[i + 1];
          const x2 = relatif ? x + n[i + 2] : n[i + 2];
          const y2 = relatif ? y + n[i + 3] : n[i + 3];
          x = relatif ? x + n[i + 4] : n[i + 4];
          y = relatif ? y + n[i + 5] : n[i + 5];
          ajouter({ type: 'courbe', x1, y1, x2, y2, x, y });
          cx = x2; cy = y2;
        }
        qx = qy = null;
        break;
      }
      case 'S': {
        for (let i = 0; i + 3 < n.length; i += 4) {
          const x1 = cx === null ? x : 2 * x - cx;
          const y1 = cy === null ? y : 2 * y - cy;
          const x2 = relatif ? x + n[i] : n[i];
          const y2 = relatif ? y + n[i + 1] : n[i + 1];
          x = relatif ? x + n[i + 2] : n[i + 2];
          y = relatif ? y + n[i + 3] : n[i + 3];
          ajouter({ type: 'courbe', x1, y1, x2, y2, x, y });
          cx = x2; cy = y2;
        }
        qx = qy = null;
        break;
      }
      case 'Q': {
        for (let i = 0; i + 3 < n.length; i += 4) {
          const qcx = relatif ? x + n[i] : n[i];
          const qcy = relatif ? y + n[i + 1] : n[i + 1];
          const fx = relatif ? x + n[i + 2] : n[i + 2];
          const fy = relatif ? y + n[i + 3] : n[i + 3];
          ajouter(quadratiqueVersCubique(x, y, qcx, qcy, fx, fy));
          qx = qcx; qy = qcy;
          x = fx; y = fy;
          cx = cy = null;
        }
        break;
      }
      case 'T': {
        for (let i = 0; i + 1 < n.length; i += 2) {
          const qcx = qx === null ? x : 2 * x - qx;
          const qcy = qy === null ? y : 2 * y - qy;
          const fx = relatif ? x + n[i] : n[i];
          const fy = relatif ? y + n[i + 1] : n[i + 1];
          ajouter(quadratiqueVersCubique(x, y, qcx, qcy, fx, fy));
          qx = qcx; qy = qcy;
          x = fx; y = fy;
          cx = cy = null;
        }
        break;
      }
      case 'A':
        throw new CheminNonSupporte(
          "arc elliptique rencontre dans un chemin SVG. Le convertisseur refuse "
          + "de l'approximer : une approximation silencieuse deformerait le logo."
        );
      case 'Z': {
        if (courant) courant.ferme = true;
        x = dx; y = dy;
        cx = cy = qx = qy = null;
        courant = null;
        break;
      }
      default:
        throw new CheminNonSupporte(`commande de chemin inconnue : ${commande}`);
    }
  }

  return sousChemins.filter((s) => s.segments.length > 0);
}

function quadratiqueVersCubique(x0, y0, qcx, qcy, x1, y1) {
  return {
    type: 'courbe',
    x1: x0 + (2 / 3) * (qcx - x0),
    y1: y0 + (2 / 3) * (qcy - y0),
    x2: x1 + (2 / 3) * (qcx - x1),
    y2: y1 + (2 / 3) * (qcy - y1),
    x: x1,
    y: y1,
  };
}
