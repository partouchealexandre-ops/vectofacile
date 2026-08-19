/**
 * Comment un verdict se dit. Pas de la cosmetique : des regles de charte, et
 * chacune protege d'un mensonge precis.
 *
 * REGLE 1, ARBITRÉ ALEX du 19/08/2026, inseparable de l'arbitrage P0.5.
 * Le verdict repose sur l'enveloppe COMMERCIALE : ce que les grands
 * fabricants acceptent de produire en serie. Il doit donc dire
 * « refusé chez la plupart des fabricants », JAMAIS « impossible ».
 * Un seuil commercial enonce comme une limite physique est un mensonge sur ce
 * qu'on mesure. Le harnais controle l'absence des mots interdits.
 *
 * REGLE 2, charte du projet. Jamais de pourcentage de confiance dans un
 * verdict. Un « 87 % de chances que ca passe » n'est adosse a rien de
 * mesurable et transforme une mesure en horoscope.
 *
 * REGLE 3, trouvee par le Fil meta le 19/08. Un verdict calcule sur une
 * mediane de famille doit DIRE sur quoi il calcule. Le visiteur choisit
 * « mug » sur un picto, pas SON mug : un verdict de taille peut se tromper
 * d'un tiers sur un objet particulier, et le silence sur ce point est ce qui
 * rend l'erreur invisible.
 */

export const MOTS_INTERDITS = Object.freeze([
  'impossible', 'impossibles', 'infaisable', 'infaisables',
  'jamais marquable', 'ne peut pas être marqué', 'ne peut pas etre marque',
]);

/** Un pourcentage suivi du mot confiance, ou une probabilite affichee. */
export const MOTIF_CONFIANCE = /(\d+\s*%|\bprobabilit|\bconfiance\b|\bchances?\s+(?:sur|que)\b)/i;

export const LIBELLES = Object.freeze({
  favorable: 'passe chez la plupart des fabricants',
  defavorable: 'refusé chez la plupart des fabricants',
  inconnu: 'nous ne savons pas encore',
});

/**
 * La phrase d'un critere, avec sa mesure et son seuil. Toujours la mesure
 * AVANT le jugement : le visiteur doit pouvoir contester le chiffre, pas
 * seulement subir la conclusion.
 */
export function direCritere(critere) {
  const { libelle, mesure, unite, seuil, sens, etat } = critere;
  if (critere.etat_verdict === 'inconnu') {
    return `${libelle} : ${LIBELLES.inconnu}${critere.raison ? ` (${critere.raison})` : ''}.`;
  }
  const comparateur = sens === 'minimum' ? 'le minimum retenu est' : 'le maximum retenu est';
  const jugement = LIBELLES[critere.etat_verdict];
  return `${libelle} : ${formater(mesure)} ${unite}, ${comparateur} `
    + `${formater(seuil)} ${unite}. ${majuscule(jugement)}.`;
}

/**
 * La phrase qui dit sur quoi le verdict a calcule. REGLE 3.
 * Elle n'est pas optionnelle des qu'une dimension d'objet entre dans le calcul.
 */
export function direBase(base) {
  if (!base) return null;
  if (base.origine === 'saisie') {
    return `Calculé sur les dimensions que vous avez indiquées : ${base.description}.`;
  }
  return `Calculé pour ${base.description}. Votre objet peut différer, `
    + `et dans ce cas le résultat aussi.`;
}

function formater(v) {
  if (v === null || v === undefined) return 'non renseigné';
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v);
  return (Math.round(n * 100) / 100).toString().replace('.', ',');
}

function majuscule(t) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}
