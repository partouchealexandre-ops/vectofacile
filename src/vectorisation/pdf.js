/**
 * Ecriture d'un PDF a une page a partir du MEME programme de trace que l'EPS.
 *
 * Le PDF accompagne l'EPS parce que tout le monde sait l'ouvrir, y compris le
 * client qui veut juste verifier avant d'envoyer. Il n'a ni police ni image :
 * uniquement des chemins et des couleurs, ce qui est exactement ce qu'un
 * marqueur attend d'un fichier vectoriel.
 *
 * Le flux de contenu n'est pas compresse. Sur un logo, l'ecart de taille est de
 * quelques dizaines de kilo octets, et un PDF lisible en clair est un PDF qu'on
 * peut deboguer et verifier a l'oeil. Le jour ou la taille compte, zlib est
 * disponible dans le navigateur via CompressionStream.
 */

import { calculerCadre, emettreForme, nb } from './geometrie.js';

const MOTS = { allerA: 'm', ligne: 'l', courbe: 'c', fermer: 'h' };

function octets(texte) {
  return new TextEncoder().encode(texte).length;
}

/** Date au format PDF : D:AAAAMMJJHHmmSS. */
function dateP(iso) {
  const propre = iso.replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '');
  return `D:${propre}`;
}

export function versPdf(programme, options = {}) {
  const cadre = calculerCadre(programme, options);
  const titre = (options.titre || 'logo').replace(/[()\\]/g, '').replace(/[^\x20-\x7E]/g, '');
  const date = dateP(options.date || new Date().toISOString());

  const contenu = [];
  if (cadre.largeurMm) {
    contenu.push(`% taille de marquage demandee : ${nb(cadre.largeurMm)} x ${nb(cadre.hauteurMm)} mm`);
  }
  for (const forme of programme.formes) {
    const [r, v, b] = forme.rvb;
    contenu.push(`${nb(r / 255)} ${nb(v / 255)} ${nb(b / 255)} rg`);
    contenu.push(...emettreForme(forme, cadre, programme.hauteur, MOTS));
    contenu.push(forme.regle === 'evenodd' ? 'f*' : 'f');
    if (forme.opacite < 1) {
      throw new Error(
        "transparence partielle rencontree. Elle demanderait un etat graphique "
        + "ExtGState : a traiter explicitement le jour ou le cas se presente, "
        + "pas a aplatir en silence."
      );
    }
  }
  const flux = contenu.join('\n') + '\n';

  const objets = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${nb(cadre.largeurPt)} ${nb(cadre.hauteurPt)}] `
      + '/Contents 4 0 R /Resources << /ProcSet [/PDF] >> >>',
    `<< /Length ${octets(flux)} >>\nstream\n${flux}endstream`,
    `<< /Producer (Vecto Facile) /Title (${titre}) /CreationDate (${date}) >>`,
  ];

  let sortie = '%PDF-1.4\n%âãÏÓ\n';
  const positions = [];
  objets.forEach((corps, i) => {
    positions.push(octets(sortie));
    sortie += `${i + 1} 0 obj\n${corps}\nendobj\n`;
  });

  const debutXref = octets(sortie);
  let xref = `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const p of positions) xref += `${String(p).padStart(10, '0')} 00000 n \n`;
  sortie += xref;
  sortie += `trailer\n<< /Size ${objets.length + 1} /Root 1 0 R /Info ${objets.length} 0 R >>\n`;
  sortie += `startxref\n${debutXref}\n%%EOF\n`;

  return sortie;
}
