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
