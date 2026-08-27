/**
 * DU PROGRAMME DE TRACE A UNE TOILE, 26/08/2026.
 *
 * POURQUOI CE MODULE EXISTE. Le simulateur de /voir-mon-logo pose une IMAGE
 * sur la photo d'un objet. Quand le visiteur arrive de /vectoriser, on tient
 * mieux qu'une image : on tient le programme de trace qu'on vient de
 * fabriquer. Le lui redonner en pixels, dessine a partir de nos courbes,
 * c'est lui montrer sur l'objet exactement ce que son marqueur recevra.
 *
 * POURQUOI ON NE PASSE PAS LE SVG. Un SVG pose dans une balise `img` puis
 * dessine dans une toile SOUILLE cette toile dans certains navigateurs : la
 * lecture des pixels y devient interdite, et c'est precisement ce que le
 * simulateur fait pour reperer le blanc a detourer. Le detourage tomberait en
 * panne chez une partie des visiteurs, sans erreur, sans trace. On dessine
 * donc nos chemins nous memes : la toile reste propre par construction.
 *
 * ET LA TAILLE NE SE DEVINE PAS. Un logo vectoriel n'a pas de resolution ; on
 * choisit la notre, la meme pour tous, mille deux cents pixels sur le grand
 * cote. Assez pour que le logo reste net quand le simulateur l'agrandit dans
 * la zone de marquage, assez petit pour tenir dans le stockage de session
 * sans jamais s'en approcher.
 */

/** Le grand cote de la toile rendue, en pixels. */
export const COTE_TOILE_PX = 1200;

/**
 * Dessine le programme dans un contexte 2D, a l'echelle donnee.
 *
 * L'ordre des formes est celui du programme, et il compte : le fond est pose
 * en premier, les formes suivantes le recouvrent. C'est la meme pile que dans
 * l'EPS et dans le PDF, et pour la meme raison.
 */
export function dessinerProgramme(contexte, programme, echelle = 1) {
  for (const forme of programme.formes) {
    contexte.beginPath();
    for (const sousChemin of forme.sousChemins) {
      for (const s of sousChemin.segments) {
        if (s.type === 'depart') contexte.moveTo(s.x * echelle, s.y * echelle);
        else if (s.type === 'ligne') contexte.lineTo(s.x * echelle, s.y * echelle);
        else {
          contexte.bezierCurveTo(s.x1 * echelle, s.y1 * echelle,
                                 s.x2 * echelle, s.y2 * echelle,
                                 s.x * echelle, s.y * echelle);
        }
      }
      if (sousChemin.ferme !== false) contexte.closePath();
    }
    contexte.globalAlpha = Number.isFinite(forme.opacite) ? forme.opacite : 1;
    contexte.fillStyle = `rgb(${forme.rvb[0]}, ${forme.rvb[1]}, ${forme.rvb[2]})`;
    contexte.fill(forme.regle === 'evenodd' ? 'evenodd' : 'nonzero');
  }
  contexte.globalAlpha = 1;
}

/**
 * L'IMAGE DEPOSEE, RENDUE EN PNG, 27/08/2026.
 *
 * POURQUOI ELLE EXISTE A COTE DE LA PRECEDENTE. Sur l'accueil, tout le monde
 * n'a pas de programme de trace : un PDF ou un fichier Illustrator est mesure
 * DIRECTEMENT, sans etre retrace, et une image refusee a la vectorisation n'en
 * produit pas non plus. Ces visiteurs ont pourtant un diagnostic complet, et
 * ce sont meme ceux qui tiennent le meilleur fichier. Leur refuser le
 * simulateur parce qu'on n'a rien FABRIQUE serait leur faire payer notre
 * decoupage interne.
 *
 * ON N'AGRANDIT JAMAIS. Le programme de trace n'a pas de resolution et se rend
 * a la taille qu'on veut ; une image en a une, et l'etirer au dela ne montre
 * que ses propres pixels. On reduit donc si besoin, jamais l'inverse.
 *
 * @returns {string|null} l'URL de donnees, ou null si rien n'est dessinable.
 */
export function imageVersPng(image, coteMax = COTE_TOILE_PX) {
  if (!image?.donnees || !(image.largeur > 0) || !(image.hauteur > 0)) return null;
  const source = document.createElement('canvas');
  source.width = image.largeur;
  source.height = image.hauteur;
  const dedans = source.getContext('2d');
  if (!dedans) return null;
  const donnees = dedans.createImageData(image.largeur, image.hauteur);
  donnees.data.set(image.donnees);
  dedans.putImageData(donnees, 0, 0);

  const cote = Math.max(image.largeur, image.hauteur);
  const echelle = Math.min(1, coteMax / cote);
  if (echelle === 1) return source.toDataURL('image/png');
  const toile = document.createElement('canvas');
  toile.width = Math.max(1, Math.round(image.largeur * echelle));
  toile.height = Math.max(1, Math.round(image.hauteur * echelle));
  const contexte = toile.getContext('2d');
  if (!contexte) return null;
  contexte.imageSmoothingEnabled = true;
  contexte.imageSmoothingQuality = 'high';
  contexte.drawImage(source, 0, 0, toile.width, toile.height);
  return toile.toDataURL('image/png');
}

/**
 * Le programme rendu en PNG, sous forme d'URL de donnees.
 *
 * LE FOND RESTE CE QU'IL EST. Si le logo d'origine avait un fond blanc, le
 * programme porte une forme blanche et la toile sort avec son fond blanc :
 * c'est ce que le fichier livre dessine, on ne l'enjolive pas. Le simulateur
 * a deja son propre detourage, et c'est au visiteur de decider s'il veut
 * retirer ce blanc, pas a nous de le faire dans son dos.
 */
export function programmeVersPng(programme, coteMax = COTE_TOILE_PX) {
  if (!programme?.formes?.length) return null;
  const cote = Math.max(programme.largeur, programme.hauteur);
  if (!(cote > 0)) return null;
  const echelle = coteMax / cote;
  const toile = document.createElement('canvas');
  toile.width = Math.max(1, Math.round(programme.largeur * echelle));
  toile.height = Math.max(1, Math.round(programme.hauteur * echelle));
  const contexte = toile.getContext('2d');
  if (!contexte) return null;
  dessinerProgramme(contexte, programme, echelle);
  return toile.toDataURL('image/png');
}
