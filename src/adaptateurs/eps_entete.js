/**
 * CE QU'UN EPS DIT DE LUI MEME, SANS L'EXECUTER.
 *
 * LE 24/08/2026, VINGT CINQ FICHIERS REELS. Sur les EPS que des clients avaient
 * envoyes a Alex, le site repondait « nous ne prenons pas ce format,
 * reenregistrez le en PDF depuis votre logiciel ». Ce conseil suppose que la
 * personne possede Illustrator, c'est a dire l'hypothese la moins probable chez
 * quelqu'un qui a recu un EPS de son graphiste il y a six ans.
 *
 * CE QU'ON PEUT DIRE SANS INTERPRETE. Un EPS est un programme PostScript : pour
 * savoir ce qu'il DESSINE, il faut l'executer, et aucun navigateur ne le sait.
 * Mais son EN-TETE est du texte en clair, normalise par Adobe depuis 1992, et
 * il porte deux choses vraies : la taille du dessin, et le logiciel qui l'a
 * ecrit. Les lire ne demande aucune dependance.
 *
 * CE QU'ON NE DIRA JAMAIS ICI. Que le logo « passe ». Un EPS peut contenir
 * douze couleurs, un degrade, un trait de cinq centiemes de millimetre : rien
 * de tout cela n'est dans l'en-tete. Le site sait dire que le FORMAT est le bon,
 * il ne sait pas dire que le DESSIN convient, et confondre les deux serait
 * exactement le mensonge que ce projet refuse.
 *
 * Fonction PURE : elle prend des octets, elle rend un objet.
 */

/** Un point PostScript vaut un soixante douzieme de pouce. */
const MM_PAR_POINT = 25.4 / 72;

/**
 * L'EN-TETE BINAIRE DOS, et pourquoi il faut le sauter.
 *
 * Un EPS produit sous Windows ou par Illustrator commence souvent par trente
 * octets binaires qui disent ou trouver le PostScript, et ou trouver l'apercu
 * TIFF ou WMF. Vingt et un des vingt cinq fichiers du corpus reel en ont un.
 * Lire l'en-tete sans le sauter donne du charabia : le fichier serait declare
 * illisible alors qu'il est parfaitement conforme.
 */
function sectionPostscript(octets) {
  if (octets.length > 30 && octets[0] === 0xC5 && octets[1] === 0xD0
      && octets[2] === 0xD3 && octets[3] === 0xC6) {
    const vue = new DataView(octets.buffer, octets.byteOffset, 30);
    return {
      debut: vue.getUint32(4, true),
      longueur: vue.getUint32(8, true),
      apercu: vue.getUint32(20, true) ? 'TIFF' : (vue.getUint32(12, true) ? 'WMF' : null),
    };
  }
  return { debut: 0, longueur: octets.length, apercu: null };
}

/**
 * Reconnait un EPS et lit ce que son en-tete declare.
 * Rend `null` si ce n'est pas du PostScript.
 */
export function lireEnteteEps(tampon) {
  const octets = new Uint8Array(tampon);
  const { debut, apercu } = sectionPostscript(octets);
  // Quatre kilo octets suffisent : le DSC impose les commentaires d'en-tete
  // AVANT toute donnee, et %%EndComments les ferme.
  const tete = new TextDecoder('latin1')
    .decode(octets.subarray(debut, Math.min(debut + 4096, octets.length)));
  if (!tete.startsWith('%!PS')) return null;

  const eps = /EPSF/.test(tete.slice(0, 60));
  const createur = (tete.match(/%%Creator:\s*([^\r\n]{0,70})/) ?? [])[1] ?? '';
  const titre = (tete.match(/%%Title:\s*([^\r\n]{0,70})/) ?? [])[1] ?? '';

  // LA HAUTE DEFINITION D'ABORD. %%HiResBoundingBox porte des decimales,
  // %%BoundingBox est arrondi au point entier : sur un logo de vingt
  // millimetres, l'arrondi represente un pour cent de la taille annoncee.
  const boite = lireBoite(tete, '%%HiResBoundingBox') ?? lireBoite(tete, '%%BoundingBox');

  return {
    format: eps ? 'eps' : 'postscript',
    createur: nettoyer(createur),
    titre: nettoyer(titre),
    apercu,
    largeurMm: boite ? boite.largeurPt * MM_PAR_POINT : null,
    hauteurMm: boite ? boite.hauteurPt * MM_PAR_POINT : null,
    largeurPt: boite ? boite.largeurPt : null,
    hauteurPt: boite ? boite.hauteurPt : null,
  };
}

function lireBoite(tete, mot) {
  const m = tete.match(new RegExp(`${mot}:\\s*(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)`));
  if (!m) return null;
  const [x1, y1, x2, y2] = m.slice(1, 5).map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
  const largeurPt = x2 - x1;
  const hauteurPt = y2 - y1;
  // Une boite nulle ou negative n'est pas une mesure : c'est un fichier casse,
  // ou un « (atend) » que le producteur n'a jamais renseigne. On prefere ne
  // rien dire plutot que d'annoncer zero millimetre.
  if (!(largeurPt > 0 && hauteurPt > 0)) return null;
  return { largeurPt, hauteurPt };
}

/**
 * Le nom du logiciel producteur, debarrasse de ses echappements PostScript.
 * Illustrator ecrit parfois « (Adobe Illustrator\(R\) 29.8) », parentheses et
 * antislashs compris : les servir tels quels donnerait du code a l'ecran.
 */
function nettoyer(brut) {
  return brut.replace(/\\([()])/g, '$1').replace(/^\(|\)$/g, '').trim();
}
