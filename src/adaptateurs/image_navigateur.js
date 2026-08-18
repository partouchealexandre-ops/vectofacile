/**
 * Adaptateur navigateur : d'un fichier depose a l'image nue que le moteur sait
 * mesurer.
 *
 * Tout ce qui touche au decodage vit ici, et nulle part ailleurs. Le moteur ne
 * connait ni PNG, ni JPEG, ni canvas : il recoit { largeur, hauteur, donnees }.
 * C'est cette frontiere qui permet au harnais de rejouer exactement le meme
 * code sur des pixels lus dans un fichier brut, sans navigateur.
 *
 * Rappel de l'interdit de telemetrie du projet : rien de ce qui passe ici ne
 * quitte la machine du visiteur. Pas d'envoi, pas de vignette, pas de nom de
 * fichier. Le fichier est lu, mesure, vectorise, rendu. Il ne voyage pas.
 */

/** Au dela de cette largeur, on reduit avant de mesurer. */
export const LARGEUR_MAXIMALE = 2000;

export class FichierNonSupporte extends Error {}

const TYPES_ADMIS = new Set([
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
]);

/**
 * @param {File|Blob} fichier
 * @returns {Promise<{largeur:number, hauteur:number, donnees:Uint8ClampedArray, reduction:number, largeurOrigine:number, hauteurOrigine:number}>}
 */
export async function lireImage(fichier, options = {}) {
  const largeurMaximale = options.largeurMaximale ?? LARGEUR_MAXIMALE;

  if (fichier.type && !TYPES_ADMIS.has(fichier.type)) {
    throw new FichierNonSupporte(
      `format non gere : ${fichier.type}. Les fichiers PDF, AI et EPS demandent `
      + 'un autre chemin, ils ne sont pas des images matricielles.'
    );
  }

  let source;
  try {
    source = await createImageBitmap(fichier);
  } catch (e) {
    throw new FichierNonSupporte(
      "ce fichier ne s'ouvre pas comme une image. Il est peut etre corrompu, ou "
      + "porte une extension qui ne correspond pas a son contenu."
    );
  }

  const largeurOrigine = source.width;
  const hauteurOrigine = source.height;

  // La reduction n'est pas un detail de performance, elle change la mesure :
  // toutes les grandeurs en pixels doivent ensuite etre rapportees a la taille
  // d'origine. Le facteur est donc rendu avec l'image, jamais garde pour soi.
  const reduction = largeurOrigine > largeurMaximale ? largeurMaximale / largeurOrigine : 1;
  const largeur = Math.max(1, Math.round(largeurOrigine * reduction));
  const hauteur = Math.max(1, Math.round(hauteurOrigine * reduction));

  const toile = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(largeur, hauteur)
    : Object.assign(document.createElement('canvas'), { width: largeur, height: hauteur });
  const contexte = toile.getContext('2d', { willReadFrequently: true });

  // Sans ce reglage, un logo reduit voit ses aplats laver par l'interpolation
  // et le comptage de couleurs devient faux.
  contexte.imageSmoothingEnabled = reduction < 1;
  contexte.imageSmoothingQuality = 'high';
  contexte.clearRect(0, 0, largeur, hauteur);
  contexte.drawImage(source, 0, 0, largeur, hauteur);
  source.close?.();

  const donnees = contexte.getImageData(0, 0, largeur, hauteur).data;
  return { largeur, hauteur, donnees, reduction, largeurOrigine, hauteurOrigine };
}

/** Propose un fichier au telechargement, sans passer par un serveur. */
export function telecharger(contenu, nom, type) {
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const lien = document.createElement('a');
  lien.href = url;
  lien.download = nom;
  document.body.appendChild(lien);
  lien.click();
  lien.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
