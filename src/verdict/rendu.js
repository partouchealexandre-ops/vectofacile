/**
 * L'ECRAN DE RESULTAT.
 *
 * STRUCTURE DU 21/08/2026, brief « le site de reference », partie C. L'ordre
 * n'est pas une question de gout : c'est le test du couloir. Un responsable
 * com presse doit comprendre son resultat en dix secondes, sans vocabulaire du
 * metier. La page enterrait son verdict au quatrieme bloc, entre les codes
 * hexadecimaux et les mesures.
 *
 * Quatre blocs, dans cet ordre, et les quatre tiennent en un ecran et demi :
 *
 *   C1  LE VERDICT, seul, en gros. Rien d'autre ;
 *   C2  LE BOUTON, et la ligne qui dit ce qu'on recoit ;
 *   C3  LES CARTES, groupees par etat : ce qui marche, ce que le vectoriel
 *       debloque, ou ca coince ;
 *   C4  ET MAINTENANT, la suite proposee au visiteur le plus chaud du
 *       parcours, qui n'en avait aucune.
 *
 * CE QUI A DISPARU : le pave de six lignes sur les outils et les courbes. Il
 * expliquait un procede avant de donner un resultat. Sa substance vit dans les
 * questions frequentes, ou elle est mieux tournee.
 *
 * Fonction PURE : elle prend des donnees, elle rend une chaine. Pas de DOM.
 */

import { rendreGrille, rendreVerdictCourt, rendreActionFichier, rendreSuite }
  from './rendu_grille.js';

export function rendreVerdict(verdict, produitsJuges = [], fichier = null, contraste = null) {
  if (!produitsJuges.length) return '';
  // Le fichier vectoriel est-il deja fabrique et pose en bas de page ? Cela
  // change ce qu'on demande au visiteur, donc ce que la grille lui dit.
  const vectorielPret = fichier?.origine === 'vectoriel' || fichier?.vectorise === true;
  return `${rendreVerdictCourt(produitsJuges, vectorielPret, contraste)}
${rendreActionFichier(fichier)}
${rendreGrille(produitsJuges, { vectorielPret, contraste })}
${rendreSuite()}`;
}
