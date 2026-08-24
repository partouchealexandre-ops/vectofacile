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

import { rendreActionFichier, rendreSuite } from './rendu_grille.js';
import { rendreFeux, rendreFaitPrincipal, pointsAttention, rendrePointsAttention }
  from './rendu_feux.js';

/**
 * L'ORDRE DE LA PAGE, §6 du lot 1 du 21/08/2026.
 *
 *   1  le fait le plus actionnable, le nombre de couleurs reelles. C'est ce
 *      qu'un marqueur demande en premier, et ca decide de la technique comme du
 *      devis ;
 *   2  la grille des sept feux ;
 *   3  les points d'attention ;
 *   4  l'action sur le fichier, puis les telechargements, en acces permanent ;
 *   5  le bloc de contact, quand l'adresse recevra.
 *
 * LA GRILLE DE PRODUITS N'EST PLUS L'ECRAN PRINCIPAL. Elle repondait a « sur
 * quels objets », ce qui suppose de savoir a qui on parle : le 20/08, elle a
 * propose un powerbank et un stylo a une chaine de creches, sans un textile.
 * Sept techniques, c'est tout le metier, et les produits redeviennent ce
 * qu'ils doivent etre, la traduction d'une technique en objets qu'on reconnait.
 */
export function rendreVerdict(mesures, feux = [], fichier = null) {
  if (!feux.length) return '';
  const points = pointsAttention(mesures);
  // Les cartes de feu orange portent deja le bouton de conversion depuis le
  // 24/08/2026. Le bandeau du bas ne le repete pas : voir rendreActionFichier.
  const ctaDejaPorte = feux.some((f) => f.feu === 'orange' && f.nuance === 'format');
  return `${rendreFaitPrincipal(mesures?.m2Couleurs?.couleursReelles ?? null)}
${rendreFeux(feux)}
${rendrePointsAttention(points)}
${rendreActionFichier(fichier, ctaDejaPorte)}
${rendreSuite()}`;
}
