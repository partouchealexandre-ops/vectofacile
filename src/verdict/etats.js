/**
 * Les etats d'une valeur de seuil, et la seule regle qui compte : lesquels
 * peuvent servir un verdict au visiteur.
 *
 * Doctrine du referentiel, §12.6 du master prompt. Elle n'est pas rappelee ici
 * par gout de la citation : c'est la regle qu'un raccourci de code enfreint le
 * plus facilement, parce qu'une valeur INFEREE ressemble en tout point a une
 * valeur sourcee une fois qu'elle est un nombre dans un fichier JSON.
 *
 *   SOURCÉ        publie par une source professionnelle, URL et date. Sert.
 *   ARBITRÉ ALEX  tranche par Alex sur son experience, date. Sert.
 *   INFÉRÉ        deduit, calcule, provisoire. NE SERT JAMAIS.
 *   AGRÉGAT IAG   agrege depuis un catalogue, non sourcable publiquement.
 *                 NE SERT JAMAIS tant qu'Alex ne l'a pas repris en ARBITRÉ.
 *
 * Le quatrieme etat est ne le 19/08/2026. Il eclaire un arbitrage, il ne le
 * remplace pas : ouvrir la voie n'est pas franchir la porte.
 */

export const ETATS_QUI_SERVENT = Object.freeze(['SOURCÉ', 'ARBITRÉ ALEX']);
export const ETATS_CONNUS = Object.freeze([
  'SOURCÉ', 'ARBITRÉ ALEX', 'INFÉRÉ', 'AGRÉGAT IAG',
]);

export function sert(etat) {
  return ETATS_QUI_SERVENT.includes(etat);
}

/**
 * Pourquoi une valeur ne sert pas. Le visiteur ne verra jamais ce texte tel
 * quel, mais il apparait dans le journal et dans le harnais : une valeur
 * ecartee sans raison lisible finit par etre reintegree par quelqu'un qui ne
 * saura pas pourquoi elle avait ete ecartee.
 */
export function raisonDeNePasServir(etat) {
  if (etat === 'INFÉRÉ') {
    return 'valeur déduite, pas publiée par une source';
  }
  if (etat === 'AGRÉGAT IAG') {
    return 'agrégat de catalogue, en attente de reprise en arbitrage';
  }
  if (!ETATS_CONNUS.includes(etat)) {
    return `état inconnu : ${etat}`;
  }
  return null;
}
