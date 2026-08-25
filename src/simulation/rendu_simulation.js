/**
 * LE RENDU DU SIMULATEUR : le dessin, et rien que le dessin.
 *
 * Les mesures vivent dans `simulateur.js`. Ici on pose des pixels, et on REND
 * LE BITMAP A L'APPELANT : ce module ne decide pas ou l'image va, ne l'insere
 * pas d'autorite dans une page, ne la telecharge pas. Celui qui l'appelle en
 * fait ce qu'il veut, c'est ce qui permettra de la joindre a une demande de
 * devis sans reecrire ce fichier.
 *
 * CE QU'IL NE FAIT PAS : conclure. Il mesure le contraste, il ne dit pas si
 * c'est bon. L'aperçu est plus grossier que le marquage, et un module de
 * dessin n'a pas a rendre de verdict sur ce qu'il dessine.
 */
import { echelleMmParPixel, poserLogo, luminanceRelative, rapportDeContraste }
  from './simulateur.js';

/**
 * L'EPAISSEUR DU TRAIT LE PLUS FIN, en pixels de l'image d'origine.
 *
 * Mesure sur l'alpha : la plus courte suite continue de pixels opaques, en
 * ignorant les suites d'un seul pixel qui sont du crenelage et pas du trait.
 *
 * DANS LES DEUX SENS, ET C'EST TOUT L'INTERET. Une barre de 320 pixels de
 * large sur 8 de haut est un trait FIN. Balayer les lignes seules y lit 320 :
 * on annoncerait un trait epais la ou il est au bord du refus, et le sens de
 * l'erreur serait le pire possible, un faux vert sur la mesure qui decide.
 *
 * Fait mesurable, aucun jugement : c'est au diagnostic de dire ce qu'un
 * dixieme de millimetre vaut sur telle technique.
 */
export function mesurerTraitPx(imageData) {
  const { data, width, height } = imageData;
  const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 128;
  let plusFin = Infinity;

  const balayer = (nLignes, nColonnes, lire) => {
    for (let a = 0; a < nLignes; a++) {
      let suite = 0;
      for (let b = 0; b <= nColonnes; b++) {
        if (b < nColonnes && lire(a, b)) { suite++; continue; }
        if (suite > 1 && suite < plusFin) plusFin = suite;
        suite = 0;
      }
    }
  };
  balayer(height, width, (y, x) => opaque(x, y));   // horizontalement
  balayer(width, height, (x, y) => opaque(x, y));   // verticalement

  return Number.isFinite(plusFin) ? plusFin : null;
}

/** La luminance moyenne d'un rectangle de l'image, sur les pixels opaques. */
function luminanceMoyenne(data, seuilAlpha) {
  let r = 0, v = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < seuilAlpha) continue;
    r += data[i]; v += data[i + 1]; b += data[i + 2]; n++;
  }
  return n ? luminanceRelative(r / n, v / n, b / n) : null;
}

/**
 * DESSINE UNE VUE, ET REND SON BITMAP.
 *
 * `toile` est un canvas fourni par l'appelant. `photo` et `logo` sont des
 * images deja chargees. Retourne les mesures ET la toile : le bitmap
 * appartient a l'appelant.
 */
export function dessiner({ toile, vue, photo, logo, part, traitPx = null,
                           cadre = true }) {
  const x = toile.getContext('2d', { willReadFrequently: true });
  toile.width = vue.imagePx.largeur;
  toile.height = vue.imagePx.hauteur;
  x.clearRect(0, 0, toile.width, toile.height);
  if (photo) x.drawImage(photo, 0, 0, toile.width, toile.height);

  const z = vue.zonePx;

  // LE SUPPORT SE MESURE AVANT LA POSE, sinon on mesurerait le logo.
  let luminanceSupport = null;
  if (photo) {
    try {
      luminanceSupport = luminanceMoyenne(
        x.getImageData(Math.round(z.x), Math.round(z.y),
                       Math.max(1, Math.round(z.largeur)),
                       Math.max(1, Math.round(z.hauteur))).data, 0);
    } catch (e) { luminanceSupport = null; }
  }

  if (cadre) {
    x.save();
    x.strokeStyle = 'rgba(10,45,77,.35)';
    x.setLineDash([6, 5]);
    x.lineWidth = Math.max(1, z.largeur * 0.004);
    x.strokeRect(z.x, z.y, z.largeur, z.hauteur);
    x.restore();
  }

  let pose = null, contraste = null;
  if (logo) {
    pose = poserLogo({
      vue,
      logo: { largeurPx: logo.width, hauteurPx: logo.height, traitPx },
      part,
    });
    if (pose) {
      x.drawImage(logo, pose.boite.x, pose.boite.y, pose.boite.largeur, pose.boite.hauteur);
      const encre = luminanceDeLEncre(logo);
      if (luminanceSupport !== null && encre !== null) {
        contraste = rapportDeContraste(luminanceSupport, encre);
      }
    }
  }
  return { toile, pose, contraste, mmParPixel: echelleMmParPixel(vue) };
}

/** La luminance moyenne de l'encre du logo, sur ses pixels opaques. */
export function luminanceDeLEncre(logo, cote = 160) {
  const t = document.createElement('canvas');
  t.width = Math.min(logo.width, cote);
  t.height = Math.max(1, Math.round(t.width * logo.height / logo.width));
  const c = t.getContext('2d', { willReadFrequently: true });
  c.drawImage(logo, 0, 0, t.width, t.height);
  try {
    return luminanceMoyenne(c.getImageData(0, 0, t.width, t.height).data, 200);
  } catch (e) { return null; }
}
