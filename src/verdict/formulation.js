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

/**
 * REGLE 4, ouverte le 19/08/2026 avec le module situer.js.
 *
 * Quand on situe une mesure dans des valeurs publiees, la phrase doit dire
 * TROIS choses, et les trois sont contraignantes :
 *   la mesure du visiteur, pour qu'il puisse la contester ;
 *   la PLAGE publiee, pour qu'il voie qu'il n'y a pas un chiffre unique ;
 *   les MATIERES, parce que c'est la matiere qui explique l'ecart entre les
 *   sources, et qu'un ecart inexplique passe pour du desaccord.
 *
 * Ne jamais ecrire « le seuil de la serigraphie est X ». Il n'existe pas.
 */
export const LIBELLES_SITUATION = Object.freeze({
  au_dessus: 'tient les minimums publiés',
  partiel: 'tient sur une partie des matières',
  au_dessous: 'refusé chez la plupart des fabricants',
  sans_mesure: 'donnez une largeur de marquage',
  sans_trait: 'aucun trait fin à contraindre',
  sans_valeurs: 'nous ne savons pas encore',
});

/**
 * Deux matieres a citer en exemple, choisies parmi les PLUS COURTES.
 *
 * Une matiere du referentiel peut s'ecrire « feutrine, canvas tissé, liège,
 * non-tissé, nylon » : citee dans une phrase deja separee par des virgules,
 * elle devient illisible et le lecteur ne sait plus ou commence la suivante.
 * Les libelles courts, « métal », « gobelet », « textile », disent la meme
 * chose et se lisent.
 */
const DEUX_MATIERES = (liste) => {
  const t = [...liste].sort((a, b) => a.length - b.length).slice(0, 2);
  if (t.length <= 1) return t.join('');
  return `${t[0]} et ${t[1]}`;
};

export function direSituation(s, matieresQuiTiennent, matieresQuiNon) {
  const mm = (v) => (Math.round(v * 100) / 100).toFixed(2).replace('.', ',');
  const plage = `de ${mm(s.min)} à ${mm(s.max)} mm selon la matière`;
  const combien = `${s.total} minimum${s.total > 1 ? 's' : ''} publié${s.total > 1 ? 's' : ''}`;

  if (s.etat === 'sans_valeurs') {
    return 'Nous n\'avons encore aucun minimum publié pour cette technique.';
  }
  if (s.etat === 'sans_mesure') {
    return `Nous avons relevé ${combien} pour cette technique, ${plage}. `
      + 'Indiquez la largeur de votre marquage plus haut pour savoir où votre logo se situe.';
  }
  if (s.etat === 'sans_trait') {
    return `Votre logo ne porte aucun trait fin mesurable : il est fait d'aplats. `
      + `Les minimums d'épaisseur publiés pour cette technique, ${plage}, ne le `
      + 'limitent donc pas.';
  }

  const debut = `Votre trait le plus fin mesure ${mm(s.mesure)} mm à cette taille de marquage.`;

  if (s.etat === 'au_dessus') {
    return `${debut} Nous avons relevé ${combien}, ${plage} : votre trait les tient tous, `
      + `y compris le plus exigeant, ${mm(s.max)} mm sur ${s.valeurs[s.valeurs.length - 1].support}.`;
  }
  if (s.etat === 'au_dessous') {
    const bas = s.valeurs[0];
    return `${debut} Le minimum le plus bas que nous ayons relevé pour cette technique est `
      + `${mm(bas.mm)} mm, sur ${bas.support}. À cette taille de marquage, votre trait `
      + `serait ${LIBELLES.defavorable}.`;
  }
  const tient = s.tiennent.length === 1
    ? `un seul, ${DEUX_MATIERES(matieresQuiTiennent)}`
    : `${s.tiennent.length} d'entre eux, dont ${DEUX_MATIERES(matieresQuiTiennent)}`;
  const pas = s.ne_tiennent_pas.length === 1
    ? `un seul, ${DEUX_MATIERES(matieresQuiNon)}`
    : `${s.ne_tiennent_pas.length}, dont ${DEUX_MATIERES(matieresQuiNon)}`;
  return `${debut} Nous avons relevé ${combien}, ${plage}. Votre trait tient sur `
    + `${tient}. Il ne tient pas sur ${pas}.`;
}
