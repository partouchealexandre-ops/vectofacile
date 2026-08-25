/**
 * Ecriture d'un EPS a partir du programme de trace.
 *
 * Pourquoi l'EPS existe dans ce projet. Decision metier du 17/08, ARBITREE
 * ALEX : le livrable vectoriel n'est pas un SVG, parce que la plupart des
 * fabricants de goodies le refusent. Ils prennent .ai ou .eps.
 *
 * Et pourquoi PAS de .ai natif, alors qu'Alex l'a cite en premier. Le format
 * .ai est proprietaire Adobe. Les .ai modernes sont en realite des PDF avec des
 * donnees privees Adobe ; fabriquer un fichier qui se declare .ai sans etre
 * produit par Illustrator, c'est produire une contrefacon de format. On livre
 * donc un EPS, qu'Illustrator ouvre nativement, et un PDF, que tout le monde
 * ouvre. Point a confirmer par Alex aupres d'un marqueur : est ce que
 * l'extension .eps suffit en pratique, ou est ce que certains exigent
 * litteralement le .ai. La reponse ne se devine pas, elle se demande.
 */

import { calculerCadre, emettreForme, nb } from './geometrie.js';

const MOTS = { allerA: 'moveto', ligne: 'lineto', courbe: 'curveto', fermer: 'closepath' };

export function versEps(programme, options = {}) {
  const cadre = calculerCadre(programme, options);
  const titre = (options.titre || 'logo').replace(/[^\x20-\x7E]/g, '');
  const date = options.date || new Date().toISOString();

  const lignes = [
    '%!PS-Adobe-3.0 EPSF-3.0',
    `%%BoundingBox: 0 0 ${Math.ceil(cadre.largeurPt)} ${Math.ceil(cadre.hauteurPt)}`,
    `%%HiResBoundingBox: 0 0 ${nb(cadre.largeurPt)} ${nb(cadre.hauteurPt)}`,
    '%%Creator: Bon a Marquer',
    `%%Title: ${titre}`,
    `%%CreationDate: ${date}`,
    '%%LanguageLevel: 2',
    '%%DocumentData: Clean7Bit',
    '%%EndComments',
    '%%BeginProlog',
    '/vf_debut { newpath } bind def',
    '%%EndProlog',
    '%%Page: 1 1',
    'gsave',
  ];

  if (cadre.largeurMm) {
    lignes.push(`% taille de marquage demandee : ${nb(cadre.largeurMm)} x ${nb(cadre.hauteurMm)} mm`);
  }

  for (const forme of programme.formes) {
    if (forme.opacite < 1) {
      throw new Error(
        "transparence partielle rencontree. PostScript niveau 2 ne sait pas la "
        + "rendre, et l'aplatir en silence changerait les couleurs livrees."
      );
    }
    const [r, v, b] = forme.rvb;
    lignes.push('vf_debut');
    lignes.push(...emettreForme(forme, cadre, programme.hauteur, MOTS));
    lignes.push(`${nb(r / 255)} ${nb(v / 255)} ${nb(b / 255)} setrgbcolor`);
    lignes.push(forme.regle === 'evenodd' ? 'eofill' : 'fill');
  }

  lignes.push('grestore');
  lignes.push('%%EOF');
  return lignes.join('\n') + '\n';
}
