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
 * REGLE 4, reecrite le 20/08/2026 : ON PARLE USAGE, PAS INSTRUMENT.
 *
 * La premiere version disait « tient les minimums publiés » et « tient sur une
 * partie des matières ». C'etait exact, et illisible : ces phrases decrivent
 * notre comparaison, pas la decision du visiteur. Alex a fixe la question a
 * laquelle chaque carte doit repondre, et c'est la seule : sur quoi puis-je
 * marquer ce logo, a partir de quelle taille, et en combien de couleurs ?
 *
 * Trois disciplines d'ecriture, et chacune protege d'un mensonge :
 *   le millimetre affiche est CALCULE POUR CE LOGO, jamais un seuil general —
 *   on ecrit « marquez ce logo dès 33 mm », jamais « le minimum est 0,20 mm » ;
 *   la matiere accompagne toujours le chiffre, parce que c'est elle qui
 *   l'explique ; un chiffre sans matiere redeviendrait LE seuil qui n'existe
 *   pas ;
 *   les regles 1 et 2 tiennent : « refusé chez la plupart des fabricants »,
 *   jamais « impossible », jamais un pourcentage.
 */
export const LIBELLES_TAILLES = Object.freeze({
  sans_valeurs: 'nous ne savons pas encore',
  sans_trait: 'passe à toutes les tailles',
});

/** Un entier de millimetres, en francais. */
const entier = (v) => String(Math.round(v)).replace('.', ',');

/**
 * Une matiere CITEE DANS UNE PHRASE se raccourcit a son premier terme.
 *
 * Une source peut nommer « t-shirt, polo, sweat, veste, tote, serviette
 * éponge, casquette » : dans une phrase deja rythmee par des virgules, le
 * lecteur ne sait plus ou une matiere s'arrete et ou la suivante commence.
 * Le premier terme suffit a situer ; le libelle complet reste dans le
 * tableau depliable, avec sa source. Meme lecon que DEUX_MATIERES le 19/08.
 */
const courte = (support) => String(support).split(',')[0].trim();

/**
 * L'etiquette d'une carte : la reponse en quatre mots.
 * `verdictLargeur` n'existe que si le visiteur a donne une taille.
 */
export function etiquetteTailles(s, verdictLargeur, largeurDonneeMm) {
  if (!s || s.etat === 'sans_valeurs') return LIBELLES_TAILLES.sans_valeurs;
  if (s.etat === 'sans_trait') return LIBELLES_TAILLES.sans_trait;
  if (verdictLargeur === 'trop_petit' && Number.isFinite(largeurDonneeMm)) {
    return `trop petit à ${entier(largeurDonneeMm)} mm`;
  }
  return `dès ${entier(s.des)} mm de large`;
}

/**
 * La phrase d'une carte. Elle donne la taille la plus accessible, une matiere
 * du milieu et la plus exigeante : trois points suffisent a voir l'etendue,
 * la table depliable porte le reste.
 */
export function direTailles(s, verdictLargeur, largeurDonneeMm) {
  if (!s || s.etat === 'sans_valeurs') {
    return 'Nous n\'avons encore aucun minimum publié pour cette technique.';
  }
  if (s.etat === 'sans_trait') {
    return 'Votre logo est fait d\'aplats, sans trait fin : les finesses minimales '
      + 'publiées pour cette technique ne le limitent pas, quelle que soit la taille.';
  }

  const liste = s.parSupport;
  const premier = liste[0];
  const dernier = liste[liste.length - 1];
  let phrase = `Marquez ce logo à ${entier(premier.tailleMinMm)} mm de large ou plus `
    + `sur ${courte(premier.support)}.`;
  if (liste.length >= 3) {
    const milieu = liste[Math.floor(liste.length / 2)];
    phrase += ` Comptez ${entier(milieu.tailleMinMm)} mm sur ${courte(milieu.support)}, `
      + `et ${entier(dernier.tailleMinMm)} mm sur ${courte(dernier.support)}.`;
  } else if (liste.length === 2) {
    phrase += ` Comptez ${entier(dernier.tailleMinMm)} mm sur ${courte(dernier.support)}.`;
  }

  if (Number.isFinite(largeurDonneeMm) && verdictLargeur) {
    const l = entier(largeurDonneeMm);
    if (verdictLargeur === 'trop_petit') {
      phrase += ` À ${l} mm, ce serait ${LIBELLES.defavorable} : `
        + `passez à ${entier(s.des)} mm ou plus.`;
    } else if (verdictLargeur === 'passe_partout') {
      phrase += ` À ${l} mm, ça passe sur toutes les matières relevées.`;
    } else {
      const passent = liste.filter((v) => largeurDonneeMm >= v.tailleMinMm);
      const refusent = liste.filter((v) => largeurDonneeMm < v.tailleMinMm);
      phrase += ` À ${l} mm, ça passe sur ${passent.length} des ${liste.length} matières `
        + `relevées, mais pas sur ${courte(refusent[0].support)} (dès ${entier(refusent[0].tailleMinMm)} mm).`;
    }
  }
  return phrase;
}

/**
 * COMBIEN DE COULEURS, dit par la MECANIQUE du procede, jamais par un seuil.
 *
 * Aucune source n'a encore ete depouillee sur les maxima de couleurs par
 * technique : on ne cite donc aucun chiffre limite. Mais la mecanique, elle,
 * est un fait de procede qui ne demande aucune source commerciale : une
 * serigraphie passe un ecran par couleur, une broderie un fil par couleur, un
 * laser n'a pas d'encre du tout. Dire cette mecanique avec LE nombre de
 * couleurs du logo mesure repond a la question du visiteur sans rien inventer.
 */
const COULEURS_PAR_TECHNIQUE = Object.freeze({
  serigraphie: (n) => (n
    ? `Vos ${n} couleurs = ${n} écrans : chaque couleur est imprimée par son propre écran, souvent facturé à part.`
    : 'Chaque couleur est imprimée par son propre écran, souvent facturé à part.'),
  tampographie: (n) => (n
    ? `Vos ${n} couleurs = ${n} clichés : chaque couleur demande son propre cliché.`
    : 'Chaque couleur demande son propre cliché.'),
  gravure_laser: (n) => (n && n > 1
    ? `Le laser grave sans encre : vos ${n} couleurs deviendront une seule, la teinte de la matière gravée.`
    : 'Le laser grave sans encre : le résultat est monochrome, dans la teinte de la matière gravée.'),
  broderie: (n) => (n
    ? `Vos ${n} couleurs = ${n} fils : chaque couleur est brodée avec son propre fil.`
    : 'Chaque couleur est brodée avec son propre fil.'),
  numerique_uv: () => 'Toutes les couleurs partent en un seul passage : le nombre de couleurs ne change rien au procédé.',
  transfert_dtf: () => 'Toutes les couleurs partent en un seul passage : le nombre de couleurs ne change rien au procédé.',
  marquage_a_chaud: (n) => (n
    ? `Vos ${n} couleurs = ${n} poses de feuille : une feuille par couleur. Ce marquage se fait le plus souvent en une seule couleur.`
    : 'Une feuille par couleur : ce marquage se fait le plus souvent en une seule couleur.'),
});

export function direCouleurs(technique, nCouleurs) {
  const dire = COULEURS_PAR_TECHNIQUE[technique];
  if (!dire) return null;
  const n = Number.isInteger(nCouleurs) && nCouleurs > 0 ? nCouleurs : null;
  // Une seule couleur : la mecanique « N couleurs = N ecrans » deviendrait du
  // bruit. On dit juste que c'est le cas le plus simple partout.
  if (n === 1) return 'Votre logo est en une seule couleur : c\'est le cas le plus simple pour toutes les techniques.';
  return dire(n);
}
