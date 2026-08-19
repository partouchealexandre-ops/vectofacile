/**
 * La couche verdict : elle traduit une mesure en phrase utile.
 *
 * ARCHITECTURE, la meme que le moteur de mesure et pour la meme raison.
 * `juger` est une fonction PURE : elle prend des mesures et des seuils, elle
 * rend un objet. Pas de DOM, pas de fichier, pas de reseau, aucune valeur en
 * dur. Tout ce qui dit CE QUI est marquable vient de `seuils.json` ; tout ce
 * qui dit COMMENT on juge est ici. La confusion des deux a deja coute une fois
 * sur ce projet, du cote du moteur.
 *
 * LA REGLE CENTRALE, et c'est la seule qu'il faut retenir si on n'en retient
 * qu'une : un critere dont le seuil ne SERT PAS rend `inconnu`, jamais
 * `favorable`. L'absence de contrainte connue n'est pas une autorisation.
 * C'est le contraire de ce qu'un code ecrit vite ferait, parce que la branche
 * naturelle d'un `if (mesure > seuil)` avec seuil indefini est le passage.
 *
 * L'etat `inconnu` est un citoyen de premiere classe, pas un cas d'erreur.
 * Avec 110 contradictions et 70 trous declares au referentiel, il sera le
 * verdict le plus frequent des premieres semaines, et c'est la seule chose qui
 * distinguera ce site des autres : il dira ce qu'il ignore.
 */

import { sert, raisonDeNePasServir } from './etats.js';
import { situerMinimum, matieres } from './situer.js';

export const VERSION_VERDICT = 1;

/**
 * Les criteres jugeables, et OU chacun lit sa mesure.
 *
 * `sens` dit dans quel sens le seuil se compare :
 *   'minimum' : la mesure doit etre SUPERIEURE ou egale au seuil
 *               (un trait doit etre assez epais)
 *   'maximum' : la mesure doit etre INFERIEURE ou egale au seuil
 *               (un logo ne doit pas depasser un nombre de couleurs)
 *
 * `prudence` dit quelle borne d'un encadrement on retient. Le moteur rend les
 * epaisseurs sous forme {basse, haute} parce qu'une transformee de distance
 * sur des centres de pixels ne resout pas les largeurs paires. Sur un
 * minimum, la borne prudente est la BASSE : on juge le trait le plus fin que
 * le fichier puisse contenir, pas le plus flatteur.
 */
export const CRITERES = Object.freeze([
  {
    cle: 'couleurs',
    libelle: 'Nombre de couleurs',
    unite: 'couleurs',
    sens: 'maximum',
    lire: (m) => m?.m2Couleurs?.couleursReelles ?? null,
  },
  {
    cle: 'trait_minimal',
    libelle: 'Trait le plus fin',
    unite: 'mm',
    sens: 'minimum',
    prudence: 'basse',
    lire: (m) => borne(m?.m5TraitLePlusFin?.encadrementMm, 'basse'),
  },
  {
    cle: 'ecart_minimal',
    libelle: 'Écart le plus étroit entre deux formes',
    unite: 'mm',
    sens: 'minimum',
    prudence: 'basse',
    lire: (m) => borne(m?.m6ContreFormes?.ecartMinimalMm, 'basse'),
  },
  {
    cle: 'hauteur_de_capitale',
    libelle: 'Hauteur des capitales',
    unite: 'mm',
    sens: 'minimum',
    lire: (m) => m?.m7HauteurDeCapitale?.hauteurMm ?? null,
  },
]);

function borne(encadrement, laquelle) {
  if (encadrement === null || encadrement === undefined) return null;
  if (typeof encadrement === 'number') return encadrement;
  return encadrement[laquelle] ?? null;
}

/**
 * Juge UN critere pour UNE technique.
 *
 * Quatre chemins mènent a `inconnu`, et il faut les distinguer dans le
 * journal : le referentiel ne connait pas ce critere pour cette technique, le
 * seuil existe mais son etat ne sert pas, le seuil sert mais n'a pas de
 * valeur, ou la mesure elle-meme est absente. Les confondre reviendrait a ne
 * pas savoir quoi aller chercher pour les lever.
 */
export function jugerCritere(critere, mesures, seuilBrut) {
  const mesure = critere.lire(mesures);
  const commun = {
    cle: critere.cle,
    libelle: critere.libelle,
    unite: critere.unite,
    sens: critere.sens,
    mesure,
  };

  if (!seuilBrut) {
    return { ...commun, etat_verdict: 'inconnu', seuil: null, etat: null,
             raison: 'aucun seuil connu pour cette technique' };
  }
  const empeche = raisonDeNePasServir(seuilBrut.etat);
  if (empeche || !sert(seuilBrut.etat)) {
    return { ...commun, etat_verdict: 'inconnu', seuil: null,
             etat: seuilBrut.etat,
             raison: empeche || `état qui ne sert pas : ${seuilBrut.etat}` };
  }
  if (seuilBrut.valeur === null || seuilBrut.valeur === undefined) {
    return { ...commun, etat_verdict: 'inconnu', seuil: null,
             etat: seuilBrut.etat, raison: 'seuil déclaré sans valeur' };
  }
  if (mesure === null || mesure === undefined) {
    return { ...commun, etat_verdict: 'inconnu', seuil: seuilBrut.valeur,
             etat: seuilBrut.etat,
             raison: 'cette mesure n\'a pas pu être faite sur votre fichier' };
  }

  const passe = critere.sens === 'minimum'
    ? mesure >= seuilBrut.valeur
    : mesure <= seuilBrut.valeur;

  return {
    ...commun,
    etat_verdict: passe ? 'favorable' : 'defavorable',
    seuil: seuilBrut.valeur,
    etat: seuilBrut.etat,
    source: seuilBrut.source ?? null,
    date: seuilBrut.date ?? null,
    raison: null,
  };
}

/**
 * Juge une technique entiere.
 *
 * La regle d'agregation est volontairement severe et asymetrique :
 *   un seul critere defavorable rend la technique defavorable ;
 *   il faut que TOUS les criteres soient favorables pour qu'elle le soit ;
 *   tout le reste est inconnu.
 *
 * Autrement dit, `inconnu` ne se laisse jamais absorber par des favorables
 * voisins. Trois criteres au vert et un quatrieme qu'on ignore ne font pas un
 * feu vert : ils font « nous ne savons pas encore ». C'est le comportement qui
 * coute le plus de verdicts affirmatifs, et c'est celui qui rend le site
 * croyable.
 */
export function jugerTechnique(technique, mesures, seuilsTechnique, valeursTechnique) {
  const criteres = CRITERES.map((c) =>
    jugerCritere(c, mesures, seuilsTechnique?.criteres?.[c.cle]));

  // LA SITUATION, ajoutee le 19/08/2026.
  //
  // Elle ne remplace pas les criteres, elle repond a une autre question. Un
  // critere demande « la mesure passe-t-elle LE seuil » et suppose donc qu'un
  // seuil unique existe. La situation demande « sur quelles matieres la mesure
  // tient-elle », et cette question a une reponse aujourd'hui, avec des
  // valeurs SOURCEES, sans arbitrage supplementaire.
  let situation = null;
  if (valeursTechnique?.criteres?.trait_minimal?.valeurs?.length) {
    const brut = situerMinimum(
      borne(mesures?.m5TraitLePlusFin?.encadrementMm, 'basse'),
      valeursTechnique.criteres.trait_minimal.valeurs);
    situation = {
      ...brut,
      matieresQuiTiennent: matieres(brut.tiennent),
      matieresQuiNon: matieres(brut.ne_tiennent_pas),
    };
  }

  const aDefavorable = criteres.some((c) => c.etat_verdict === 'defavorable')
    || situation?.etat === 'au_dessous';
  const tousFavorables = criteres.every((c) => c.etat_verdict === 'favorable');

  let etat = 'inconnu';
  if (aDefavorable) etat = 'defavorable';
  else if (tousFavorables) etat = 'favorable';

  return {
    technique,
    libelle: seuilsTechnique?.libelle ?? valeursTechnique?.libelle ?? technique,
    etat,
    situation,
    criteres,
    base: seuilsTechnique?.base ?? null,
    // Ce qui manque pour lever l'inconnu. C'est la matiere du journal, et la
    // liste de courses du referentiel.
    manques: criteres
      .filter((c) => c.etat_verdict === 'inconnu')
      .map((c) => ({ critere: c.cle, raison: c.raison })),
  };
}

/**
 * Le verdict complet.
 *
 * Il ne classe pas les techniques par preference commerciale : il les rend
 * dans l'ordre du fichier de seuils, avec leur etat. Choisir quoi mettre en
 * avant est une decision de produit, elle ne se cache pas dans un tri.
 */
export function juger({ mesures, seuils, valeurs }) {
  if (!seuils || typeof seuils !== 'object') {
    throw new Error('juger : seuils manquants. Un verdict sans seuils serait '
      + 'une opinion.');
  }
  const techniques = Object.entries(seuils.techniques ?? {})
    .map(([cle, st]) => jugerTechnique(cle, mesures, st, valeurs?.techniques?.[cle]));

  const compte = (e) => techniques.filter((t) => t.etat === e).length;
  const compteSituation = (e) => techniques.filter((t) => t.situation?.etat === e).length;

  return {
    version: VERSION_VERDICT,
    versionSeuils: seuils.version ?? null,
    versionValeurs: valeurs?.version ?? null,
    techniques,
    resume: {
      favorables: compte('favorable'),
      defavorables: compte('defavorable'),
      inconnues: compte('inconnu'),
      total: techniques.length,
      // Le resume de la SITUATION, qui est celui qu'un visiteur lit vraiment.
      situees: techniques.filter((t) => t.situation
        && ['au_dessus', 'partiel', 'au_dessous'].includes(t.situation.etat)).length,
      tiennentPartout: compteSituation('au_dessus'),
      tiennentEnPartie: compteSituation('partiel'),
      neTiennentPas: compteSituation('au_dessous'),
      sansMesure: compteSituation('sans_mesure'),
    },
  };
}
