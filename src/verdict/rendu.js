/**
 * Le rendu de l'ecran de resultat.
 *
 * PIVOT DU 20/08/2026. Ce fichier rendait sept cartes par technique, un menu
 * deroulant de produits, un tableau de minimums et une rubrique de sources.
 * Tout cela decrivait NOTRE travail : ce que nous mesurons, ce que nous avons
 * releve, d'ou nous le tenons. Le visiteur, lui, regarde des objets.
 *
 * Il ne reste donc que deux blocs, et le second porte la reponse :
 *   le bandeau du FICHIER, parce que la premiere question n'est pas la taille,
 *   c'est « est-ce que ce fichier passe, en l'etat » ;
 *   la GRILLE DE PRODUITS, dessinee dans rendu_grille.js.
 *
 * Ce qui a ete retire n'a pas ete perdu : le referentiel continue d'alimenter
 * les calculs et reste une base de connaissances interne, avec toute sa
 * discipline de tracabilite. Il n'est simplement plus affiche, decision d'Alex
 * du 20/08 : le visiteur n'a pas besoin de savoir d'ou vient un chiffre, il a
 * besoin de savoir si ca passe.
 *
 * Fonction PURE : elle prend des donnees, elle rend une chaine. Pas de DOM.
 */

import { direEtatFichier } from './formulation.js';
import { rendreGrille } from './rendu_grille.js';

const echapper = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * LE BANDEAU DU FICHIER, avant tout le reste. Arbitrage Alex du 20/08 : la
 * premiere question n'est pas la taille, c'est « est-ce que ce fichier passe,
 * en l'etat ? ». La reponse porte toujours sa sortie : le .eps deja fabrique
 * en bas de page, la page Vectoriser mon logo, ou le graphiste.
 */
function rendreEtatFichier(fichier) {
  const etat = direEtatFichier(fichier);
  if (!etat) return '';
  let sortie = '';
  if (etat.sortie === 'vectoriel_pret') {
    // §7.3 du brief du 20/08 : on n'annonce plus la vectorisation comme FAITE.
    // Le calcul a eu lieu, mais l'action, c'est la remise du fichier, et elle
    // appartient au visiteur. Le lien mene aux boutons, en bas de page.
    sortie = ` <a class="cta-fichier" href="#telechargements">Obtenir mon fichier
    vectoriel</a>`;
  } else if (etat.sortie === 'faux_vectoriel') {
    sortie = ` <a href="/vectoriser">Déposez l'image d'origine de votre logo sur
    Vectoriser mon logo</a>, ou réclamez le fichier source à votre graphiste.`;
  } else if (etat.sortie === 'graphiste') {
    sortie = ` Faites établir un fichier vectoriel par un graphiste, ou repartez de la
    plus grande version disponible de votre logo :
    <a href="/questions/comment-vectoriser-un-jpeg">pourquoi la taille de départ décide
    de tout</a>.`;
  }
  // `partiel` est ne du correctif du §1 : un fichier qui ouvre une moitie des
  // techniques et pas l'autre n'est ni un feu vert ni un refus.
  const classe = etat.ton === 'ok' ? 'fichier-ok'
    : etat.ton === 'refus' ? 'fichier-refus'
      : etat.ton === 'partiel' ? 'fichier-partiel' : '';
  return `<div class="encadre etat-fichier ${classe}">
  <p>${echapper(etat.texte)}${sortie}</p>
</div>`;
}

/**
 * L'assemblage, depuis le pivot produit du 20/08/2026.
 *
 * Ce que cette fonction ne fait PLUS, et c'est le coeur du pivot :
 *
 *   elle n'affiche plus une carte par technique. Le visiteur n'arrive pas en
 *   se demandant s'il peut faire de la tampographie ;
 *   elle n'affiche plus une taille calculee sur des minimums publies ;
 *   elle n'affiche plus la rubrique des sources. Decision d'Alex, et elle est
 *   nette : le visiteur n'a pas besoin de savoir d'ou vient un chiffre, il a
 *   besoin de savoir si ca passe. Le referentiel reste une base de
 *   connaissances INTERNE, avec toute sa discipline de tracabilite, pour que
 *   NOUS sachions ce que nous affirmons.
 *
 * Ce qu'elle fait a la place : le bandeau du fichier, puis la grille des
 * produits reels. Deux blocs, et le second repond a la question posee.
 *
 * `verdict` reste calcule et transmis : il porte le nombre de couleurs et les
 * mesures dont la grille a besoin. Ses tailles par technique dorment jusqu'aux
 * arbitrages P0, elles ne sont plus rendues.
 */
export function rendreVerdict(verdict, produitsJuges = [], fichier = null, contraste = null) {
  // Le fichier vectoriel est-il deja fabrique et pose en bas de page ? Cela
  // change ce qu'on demande au visiteur, donc ce que la grille lui dit.
  const vectorielPret = fichier?.origine === 'vectoriel' || fichier?.vectorise === true;
  return `${rendreEtatFichier(fichier)}
${rendreGrille(produitsJuges, { vectorielPret, contraste })}`;
}
