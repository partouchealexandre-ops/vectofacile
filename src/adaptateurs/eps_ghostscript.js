/**
 * L'EPS DEVIENT UN PDF, CHEZ LE VISITEUR.
 *
 * CE QUI N'ALLAIT PAS. Un EPS est un programme PostScript : pour savoir ce
 * qu'il dessine, il faut l'executer. Le site ne le savait pas, et il en tirait
 * une phrase fausse : « votre fichier est deja vectoriel », affirmee sur la
 * seule foi de l'extension et de l'en-tete. Le 31/08, CadeauDNB.eps est arrive,
 * un fichier de client qui ne trace rien et colle une image de 2 246 x 2 955
 * pixels sur toute sa page. Le site lui repondait que tout allait bien.
 *
 * CE QUE CE MODULE FAIT, ET RIEN D'AUTRE. Il execute le PostScript et rend un
 * PDF. Il ne mesure pas, il ne juge pas, il ne vectorise pas. Une fois l'EPS
 * devenu PDF, TOUTE LA CHAINE EXISTE DEJA : le lecteur PDF le rend dans un
 * canevas, le moteur mesure ces pixels comme il mesure ceux d'un PNG, les sept
 * feux sortent, et le simulateur a de quoi poser le logo sur un objet.
 *
 * TOUT SE PASSE CHEZ LE VISITEUR, et c'est la condition non negociable du
 * projet. L'interprete est un WebAssembly servi depuis notre domaine. Le
 * fichier ne part pas, il n'y a pas de serveur dans cette chaine.
 *
 * CE QUE CA PESE, ET POURQUOI ON L'ASSUME. 10,5 Mo servis en brotli. C'est
 * beaucoup, et c'est charge UNIQUEMENT quand un EPS est depose : quelqu'un qui
 * arrive avec un PNG ne telecharge pas un octet de plus qu'avant. Le harnais
 * le verifie, parce qu'une regle de chargement paresseux qui casse ne se voit
 * pas a l'oeil.
 *
 * MESURE DU 31/08, avant d'ecrire une ligne : trente trois fichiers sur trente
 * trois convertis, de 40 a 288 ms, zero echec ; dans Chromium, module instancie
 * en 570 ms et memes octets en sortie qu'en natif.
 *
 * LICENCE. GhostPDL est sous AGPL v3, et le front qui le charge devient une
 * oeuvre combinee avec lui. Le depot est passe sous AGPL au patch precedent,
 * avec l'offre de source dans les mentions legales.
 */

/** Ou l'interprete est servi. Notre domaine, jamais un CDN. */
const BASE = '/gs/';

let promesseModule = null;

/**
 * UNE SEULE INSTANCE, PARTAGEE ENTRE TOUS LES FICHIERS.
 *
 * Meme raison que le worker unique de pdf.js, trouvee le 20/08 : sans elle,
 * chaque depot re-instancie un module de quinze megaoctets. Le visiteur qui
 * essaie trois EPS de suite paierait trois fois.
 */
function chargerInterprete() {
  if (!promesseModule) {
    promesseModule = import(/* @vite-ignore */ `${BASE}gs.js`)
      .then((mod) => (mod.default ?? mod)())
      .catch((e) => {
        // La promesse memorisee ne doit pas retenir un echec : le visiteur
        // dont le reseau a coupe une fois pourrait redeposer et reussir.
        promesseModule = null;
        throw e;
      });
  }
  return promesseModule;
}

export class EpsNonInterprete extends Error {}

/**
 * Execute un EPS et rend le PDF correspondant.
 *
 * @param {Uint8Array} octets le fichier depose
 * @param {(etape: string) => void} [direEtape] pour annoncer le telechargement
 * @returns {Promise<Uint8Array>} les octets du PDF
 */
export async function epsVersPdf(octets, direEtape) {
  // LE TELECHARGEMENT S'ANNONCE. Dix megaoctets sur une connexion mobile, ce
  // sont plusieurs secondes ou l'ecran ne bouge pas. Un outil qui se tait
  // pendant ce temps la passe pour casse.
  if (direEtape) direEtape('Préparation de la lecture PostScript');
  let Module;
  try {
    Module = await chargerInterprete();
  } catch (e) {
    throw new EpsNonInterprete(
      'la lecture des fichiers PostScript n\'a pas pu se charger '
      + `(${e?.message || 'raison inconnue'}). Réessayez, ou déposez ce logo `
      + 'en PDF si vous en avez une version.');
  }

  if (direEtape) direEtape('Lecture du fichier PostScript');
  const ENTREE = 'depose.eps';
  const SORTIE = 'depose.pdf';
  let sortie = null;
  try {
    Module.FS.writeFile(ENTREE, octets);
    // -dEPSCrop rogne sur la boite englobante declaree : sans lui, un EPS de
    // logo sort au format d'une page entiere, avec le dessin dans un coin et
    // du vide autour, et la mesure porterait sur le vide.
    // -dSAFER interdit au programme PostScript de toucher au systeme de
    // fichiers : un EPS est du code, et il vient d'un inconnu.
    const code = Module.callMain(['-q', '-dNOPAUSE', '-dBATCH', '-dSAFER', '-dEPSCrop',
      '-sDEVICE=pdfwrite', `-sOutputFile=${SORTIE}`, ENTREE]);
    if (code !== 0) {
      throw new EpsNonInterprete(
        'ce fichier PostScript n\'a pas pu être lu jusqu\'au bout. '
        + 'Il est peut être incomplet, ou protégé.');
    }
    sortie = Module.FS.readFile(SORTIE);
  } catch (e) {
    if (e instanceof EpsNonInterprete) throw e;
    throw new EpsNonInterprete(
      `ce fichier PostScript n'a pas pu être lu (${e?.message || 'raison inconnue'}).`);
  } finally {
    // LE MENAGE COMPTE. Le systeme de fichiers du module vit aussi longtemps
    // que la page : un visiteur qui essaie cinq fichiers en garderait cinq en
    // memoire, et le plus gros du corpus reel pese 1,8 Mo.
    for (const nom of [ENTREE, SORTIE]) {
      try { Module.FS.unlink(nom); } catch { /* deja absent */ }
    }
  }

  if (!sortie || sortie.length < 400) {
    throw new EpsNonInterprete(
      'ce fichier PostScript ne contient aucun dessin lisible.');
  }
  return sortie;
}
