/**
 * RETIRER LE BLANC D'UN LOGO, comme le proposent les sites de marquage.
 *
 * Un logo arrive presque toujours avec du blanc autour, et parfois dedans. Sur
 * un tote bag ecru ou un t-shirt fonce, ce blanc se voit : le visiteur croit
 * que son logo est encadre d'un rectangle, et il l'est.
 *
 * DEUX MODES, ET LEUR DIFFERENCE EST TOUT L'INTERET.
 *
 *   COMPLET : tout pixel blanc devient transparent, ou qu'il soit. Rapide, et
 *   il TROUE le dessin : l'interieur d'un « o », le blanc des yeux d'une
 *   mascotte, une contre-forme, tout part avec le fond.
 *
 *   CONTOUR : seul le blanc qui COMMUNIQUE AVEC LE BORD de l'image devient
 *   transparent. On part des quatre bords et on se propage de proche en
 *   proche. Un blanc enferme par du dessin n'est jamais atteint, donc il
 *   reste. C'est ce qu'on veut neuf fois sur dix.
 *
 * Le mode complet n'est pas une erreur pour autant : sur un logo dont le blanc
 * interieur DOIT disparaitre, une decoupe destinee a laisser voir la matiere
 * de l'objet par exemple, c'est lui qu'il faut. D'ou deux boutons, et pas un
 * seul « detourer » qui trancherait a la place du visiteur.
 *
 * CE MODULE NE TOUCHE PAS AU FICHIER DU VISITEUR. Il rend un canvas, pour
 * l'apercu. Le fichier reste sur sa machine, intact.
 */

/**
 * A PARTIR DE QUAND UN PIXEL EST « BLANC ».
 *
 * Parametre d'instrument, pas seuil de marquage. Un JPEG compresse ne rend
 * jamais du 255 pur : son fond blanc oscille, et un seuil a 255 ne retirerait
 * rien du tout sur la moitie des logos reels. 240 laisse passer cette
 * respiration sans mordre sur un gris clair volontaire, qui descend en general
 * sous 230.
 */
export const BLANC_MINIMUM = 240;

/** Ce pixel est-il blanc, et suffisamment opaque pour compter ? */
function estBlanc(d, i, seuil) {
  return d[i + 3] > 16 && d[i] >= seuil && d[i + 1] >= seuil && d[i + 2] >= seuil;
}

/**
 * Combien de blanc, et touche-t-il le bord ?
 *
 * Sert a ne proposer le detourage QUE quand il y a quelque chose a detourer :
 * un bouton qui ne fait rien est pire qu'un bouton absent.
 */
export function auditerBlanc(imageData, seuil = BLANC_MINIMUM) {
  const { data, width, height } = imageData;
  let blancs = 0, opaques = 0, surLeBord = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i + 3] <= 16) continue;
      opaques++;
      if (!estBlanc(data, i, seuil)) continue;
      blancs++;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) surLeBord++;
    }
  }
  return { blancs, partBlanche: opaques ? blancs / opaques : 0, toucheLeBord: surLeBord > 0 };
}

/** Le calcul seul, sans canvas : c'est lui que le harnais eprouve. */
export function appliquer(imageData, mode, seuil = BLANC_MINIMUM) {
  const { data, width, height } = imageData;
  if (mode === 'complet') {
    for (let i = 0; i < data.length; i += 4) {
      if (estBlanc(data, i, seuil)) data[i + 3] = 0;
    }
    return imageData;
  }
  if (mode !== 'contour') return imageData;

  // PROPAGATION DEPUIS LES BORDS, en quatre connexites. Une pile explicite
  // plutot que la recursion : un fond blanc de deux millions de pixels ferait
  // sauter la pile d'appels du navigateur, et le logo le plus banal du monde
  // ferait planter la page.
  const vu = new Uint8Array(width * height);
  const pile = [];
  const pousser = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const p = y * width + x;
    if (vu[p] || !estBlanc(data, p * 4, seuil)) return;
    vu[p] = 1;
    pile.push(p);
  };
  for (let x = 0; x < width; x++) { pousser(x, 0); pousser(x, height - 1); }
  for (let y = 0; y < height; y++) { pousser(0, y); pousser(width - 1, y); }
  while (pile.length) {
    const p = pile.pop();
    data[p * 4 + 3] = 0;
    const x = p % width, y = (p - x) / width;
    pousser(x + 1, y); pousser(x - 1, y); pousser(x, y + 1); pousser(x, y - 1);
  }
  return imageData;
}

/**
 * Rend un NOUVEAU canvas, le logo sans son blanc. L'original n'est pas modifie.
 * `mode` vaut 'complet' ou 'contour' ; toute autre valeur rend une copie fidele.
 */
export function retirerBlanc(image, mode, seuil = BLANC_MINIMUM) {
  const toile = document.createElement('canvas');
  toile.width = image.width;
  toile.height = image.height;
  const x = toile.getContext('2d', { willReadFrequently: true });
  x.drawImage(image, 0, 0);
  let donnees;
  try { donnees = x.getImageData(0, 0, toile.width, toile.height); }
  catch (e) { return toile; }
  appliquer(donnees, mode, seuil);
  x.putImageData(donnees, 0, 0);
  return toile;
}
