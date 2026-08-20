/**
 * Adaptateur PDF et AI : d'un fichier deja vectoriel a ce que le moteur mesure.
 *
 * DEUX METIERS, PAS UN. Vectoriser un JPEG et auditer un .ai sont deux choses
 * differentes, et les confondre a produit le defaut trouve le 19/08 : la page
 * refusait le fichier de la personne a qui le diagnostic sert le plus, celle
 * qui a deja un vectoriel propre et veut savoir s'il passe.
 *
 * CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS.
 * Il rend la page dans un canvas, exactement comme un visualiseur, et il rend
 * ces pixels au moteur de mesure qui existe deja. Le moteur ne change pas d'un
 * caractere : il mesure des pixels, il n'a jamais su ce qu'il y avait derriere.
 *
 * Il ne re-vectorise RIEN. Un fichier deja vectoriel n'a rien a se faire
 * tracer, et lui appliquer un vectoriseur degraderait un dessin exact en
 * approximation. C'est la difference de fond entre les deux metiers.
 *
 * CE QUE LE PDF DONNE EN PLUS D'UNE IMAGE, et qui vaut le detour :
 *   sa taille REELLE, en millimetres, ecrite dans le fichier. Un PDF sait
 *     combien il mesure ; un PNG ne le sait pas.
 *   la nature de son contenu. On peut compter les traces et les images. Un
 *     « PDF vectoriel » qui ne contient qu'une photo collee dedans est le
 *     probleme le plus frequent des ateliers, et il est invisible a l'oeil :
 *     le fichier s'ouvre, il a la bonne extension, et il est inexploitable.
 *
 * Tout se passe chez le visiteur. pdf.js est servi depuis notre domaine, son
 * worker aussi, ses polices aussi. Aucun appel sortant.
 */

export class FichierVectorielNonLu extends Error {}

/** Ou pdf.js est servi. Notre domaine, jamais un CDN. */
const BASE = '/pdfjs/';

/**
 * Reconnait un PDF ou un AI compatible PDF.
 *
 * On ne se fie ni a l'extension ni au type MIME : un .ai est souvent annonce
 * `application/postscript` par le systeme alors que son contenu est du PDF,
 * et c'est precisement ce que le navigateur d'Alex a rapporte le 19/08. On lit
 * donc les octets.
 *
 * La signature %PDF n'est pas toujours au tout debut : certains fichiers
 * portent quelques octets devant. On la cherche dans la premiere kilo-octet,
 * ce que fait aussi la specification.
 */
export function reconnaitre(octets) {
  const debut = new Uint8Array(octets.slice(0, 1024));
  const texte = String.fromCharCode(...debut);
  if (texte.includes('%PDF-')) return 'pdf';
  if (texte.startsWith('%!PS')) return 'postscript';
  return null;
}

let promessePdfjs = null;
function chargerPdfjs() {
  if (!promessePdfjs) {
    promessePdfjs = import(/* @vite-ignore */ `${BASE}pdf.min.js`).then((mod) => {
      const lib = mod.default ?? mod;
      lib.GlobalWorkerOptions.workerSrc = `${BASE}pdf.worker.min.js`;
      // UN SEUL WORKER, PARTAGE ENTRE TOUS LES DOCUMENTS.
      //
      // Sans lui, chaque getDocument fabrique son worker, et le script du
      // worker se RE-TELECHARGE a chaque depot. Le harnais d'Alex l'a montre
      // le 20/08 : premier PDF audite, reseau coupe, deuxieme PDF en echec.
      // Chez moi le meme test passait, parce que mon navigateur servait le
      // script depuis son cache et pas le sien. Un comportement qui depend de
      // l'etat du cache du visiteur n'est pas un comportement, c'est une
      // loterie. Le worker est cree une fois, avec le lecteur, et les taches
      // ne le possedent pas : tache.destroy() libere le document, jamais lui.
      const worker = new lib.PDFWorker({ name: 'vecto-pdf' });
      return { lib, worker };
    });
  }
  return promessePdfjs;
}

const POINT_EN_MM = 25.4 / 72;

/**
 * Lit un PDF ou un AI et rend de quoi mesurer.
 *
 * @returns {Promise<{image, fiche}>}
 *   image : { largeur, hauteur, donnees, reduction, largeurOrigine, hauteurOrigine }
 *           le meme contrat que lireImage, pour que le moteur ne voie aucune
 *           difference.
 *   fiche : les faits que seul un fichier vectoriel peut donner.
 */
export async function lireVectoriel(fichier, options = {}) {
  const largeurCible = options.largeurCible ?? 2000;
  const octets = await fichier.arrayBuffer();

  const nature = reconnaitre(octets);
  if (nature === 'postscript') {
    throw new FichierVectorielNonLu(
      'ce fichier est un EPS, c\'est à dire du PostScript. Nous savons lire les '
      + 'PDF et les fichiers Illustrator enregistrés avec l\'option « Créer un '
      + 'fichier compatible PDF », qui est le réglage par défaut. Réenregistrez '
      + 'votre logo en PDF depuis votre logiciel, le diagnostic sera le même.');
  }
  if (nature !== 'pdf') {
    throw new FichierVectorielNonLu(
      'ce fichier ne commence pas comme un PDF. S\'il porte l\'extension .ai, '
      + 'il a probablement été enregistré sans l\'option de compatibilité PDF.');
  }

  const { lib: pdfjs, worker } = await chargerPdfjs();
  let doc;
  let tache;
  try {
    tache = pdfjs.getDocument({
      worker,
      data: new Uint8Array(octets),
      standardFontDataUrl: `${BASE}standard_fonts/`,
      wasmUrl: `${BASE}wasm/`,
      // Aucune requete sortante, aucun script du document execute.
      isEvalSupported: false,
      disableAutoFetch: true,
    });
    doc = await tache.promise;
  } catch (e) {
    throw new FichierVectorielNonLu(
      `ce PDF ne s'ouvre pas (${e?.message || 'raison inconnue'}). Il est peut être `
      + 'protégé par un mot de passe, ou endommagé.');
  }

  const page = await doc.getPage(1);
  const naturelle = page.getViewport({ scale: 1 });
  const largeurMm = naturelle.width * POINT_EN_MM;
  const hauteurMm = naturelle.height * POINT_EN_MM;

  const echelle = largeurCible / naturelle.width;
  const vue = page.getViewport({ scale: echelle });
  const largeur = Math.max(1, Math.round(vue.width));
  const hauteur = Math.max(1, Math.round(vue.height));

  const canevas = globalThis.document.createElement('canvas');
  canevas.width = largeur;
  canevas.height = hauteur;
  const ctx = canevas.getContext('2d', { willReadFrequently: true });

  // FOND TRANSPARENT, PAS BLANC. Un visualiseur PDF dessine du blanc derriere
  // la page ; nous non. Un logo detoure doit rester detoure, sinon on
  // diagnostiquerait un fond que le fichier n'a pas, et le conseil « votre logo
  // a un fond » serait faux sur tous les PDF.
  ctx.clearRect(0, 0, largeur, hauteur);
  await page.render({ canvasContext: ctx, viewport: vue, background: 'rgba(0,0,0,0)' }).promise;

  const donnees = ctx.getImageData(0, 0, largeur, hauteur).data;
  const contenu = await analyserContenu(page, pdfjs);
  const pages = doc.numPages;
  // C'est la TACHE de chargement qui se detruit, pas le document : pdf.js 6
  // n'expose plus destroy() sur le document. Le worker et sa memoire partent
  // avec elle, et ce menage compte : un visiteur qui essaie cinq fichiers de
  // suite en garderait cinq en memoire.
  await tache.destroy();

  return {
    image: {
      largeur, hauteur, donnees,
      reduction: 1,
      largeurOrigine: largeur,
      hauteurOrigine: hauteur,
    },
    fiche: {
      format: 'pdf',
      pages,
      largeurMm: arrondir(largeurMm),
      hauteurMm: arrondir(hauteurMm),
      rendueA: largeur,
      ...contenu,
    },
  };
}

function arrondir(v) { return Math.round(v * 100) / 100; }

/**
 * DE QUOI CE FICHIER EST-IL FAIT.
 *
 * C'est le controle le plus utile de tout le module, et il n'a pas
 * d'equivalent sur une image : un PDF dit ce qu'il contient. On compte les
 * operations de trace et les operations d'image.
 *
 * Un fichier qui ne contient QUE des images n'est pas un vectoriel, quoi
 * qu'en dise son extension. C'est le probleme le plus frequent des ateliers,
 * et il est invisible : le fichier s'ouvre, il porte la bonne extension, et il
 * est inexploitable des qu'on l'agrandit.
 */
async function analyserContenu(page, pdfjs) {
  const OPS = pdfjs.OPS;
  let liste;
  try {
    liste = await page.getOperatorList();
  } catch (e) {
    return { traces: null, images: null, texte: null, faux_vectoriel: null };
  }

  const OPS_IMAGE = new Set([
    OPS.paintImageXObject, OPS.paintInlineImageXObject,
    OPS.paintImageMaskXObject, OPS.paintImageXObjectRepeat,
    OPS.paintImageMaskXObjectRepeat, OPS.paintImageMaskXObjectGroup,
  ].filter((v) => v !== undefined));
  const OPS_TRACE = new Set([
    OPS.fill, OPS.eoFill, OPS.stroke, OPS.fillStroke, OPS.eoFillStroke,
    OPS.closeFillStroke, OPS.closeEOFillStroke, OPS.closeStroke,
    OPS.constructPath,
  ].filter((v) => v !== undefined));
  const OPS_TEXTE = new Set([
    OPS.showText, OPS.showSpacedText,
  ].filter((v) => v !== undefined));

  let traces = 0, images = 0, texte = 0;
  for (const fn of liste.fnArray) {
    if (OPS_TRACE.has(fn)) traces++;
    else if (OPS_IMAGE.has(fn)) images++;
    else if (OPS_TEXTE.has(fn)) texte++;
  }

  return {
    traces, images, texte,
    // Le seuil est un PARAMETRE D'INSTRUMENT, pas une regle de marquage : il
    // dit a partir de quand on ose appeler un fichier « faux vectoriel ». Un
    // logo vectoriel a des dizaines de traces ; un scan colle dans un PDF en a
    // zero ou une, celle du cadre.
    faux_vectoriel: images > 0 && traces <= 1,
  };
}
