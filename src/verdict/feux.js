/**
 * LA GRILLE DE FEUX PAR TECHNIQUE.
 *
 * LOT 1 du 21/08/2026, et c'est un renversement, pas un habillage.
 *
 * CE QUI NE MARCHAIT PAS. Le 20/08, un vrai logo de chaine de creches a recu
 * sept cartes produits dont un powerbank et un stylo en aluminium, et AUCUN
 * textile, alors que le polo et le tote bag sont les premiers objets marques de
 * ce secteur. Il n'y avait pas d'erreur de calcul : le site ne sait pas a qui
 * il parle, et il ne peut pas le savoir, parce qu'il montrait un echantillon
 * arbitraire de matieres.
 *
 * LE RENVERSEMENT. On cesse de montrer un echantillon de produits, on montre la
 * carte COMPLETE des techniques. Sept techniques, c'est tout le metier : le
 * « sur 7 » cesse d'etre arbitraire. Et les produits ne sont plus le verdict,
 * ils deviennent la TRADUCTION : personne ne sait ce qu'est la tampographie,
 * tout le monde comprend « stylo, gourde, powerbank ».
 *
 * LE FEU REPOND A UNE QUESTION D'ACTION, jamais a un jugement de valeur :
 * puis-je envoyer ce fichier tel quel pour cette technique ?
 *
 *   VERT      rien a faire, le visiteur est servi ;
 *   ORANGE A  le format bloque, et NOUS le reglons, gratuitement, ici ;
 *   ORANGE B  la definition bloque, et nous ne pouvons PAS la regler :
 *             vectoriser un logo de 200 pixels donne un fichier propre et une
 *             forme fausse. La bonne reponse est de chercher un fichier plus
 *             grand ;
 *   ROUGE     le logo lui-meme doit etre retravaille, et on ecrit le brief du
 *             graphiste a la place du visiteur.
 *
 * Fonction PURE : pas de DOM, pas de fetch. Elle se teste dans node.
 */

import { DPI_PLANCHER, dpiALaTaille } from './techniques.js';

/**
 * LES SEPT TECHNIQUES, dans l'ordre de FREQUENCE D'USAGE, jamais
 * alphabetique : le visiteur doit reconnaitre son cas dans les deux premieres
 * lignes. Ce sont les sept familles du referentiel, celles qui ont un guide.
 *
 * `produits` est la traduction, et c'est la partie la plus utile de la ligne.
 * `monochrome` marque les techniques qui ne rendent qu'une seule teinte : ce
 * sont les seules ou la fusion en monochrome se juge. Le mot dit le RESULTAT,
 * pas le geste : le laser retire de la matiere quand le marquage a chaud en
 * pose une, et les deux finissent avec une teinte unique.
 */
export const TECHNIQUES_FEUX = Object.freeze([
  {
    cle: 'numerique_uv',
    nom: 'Impression numérique',
    guide: '/guide/impression-numerique-uv',
    definition: 'Le dessin est imprimé directement sur l\'objet, toutes couleurs en un passage.',
    produits: 'stylo, powerbank, gourde, règle, chargeur, boîtier',
    exigeVectoriel: false,
    monochrome: false,
    supporteDegrade: true,
  },
  {
    cle: 'transfert_dtf',
    nom: 'Transfert numérique',
    guide: '/guide/transfert-dtf',
    definition: 'Le dessin est imprimé sur un film, puis pressé à chaud sur le textile.',
    produits: 't-shirt, tote bag, sweat, casquette, sac à dos, parapluie',
    exigeVectoriel: false,
    monochrome: false,
    supporteDegrade: true,
  },
  {
    cle: 'serigraphie',
    nom: 'Sérigraphie',
    guide: '/guide/serigraphie',
    definition: 'Une couleur, un écran, un passage de machine. La technique de série par excellence.',
    produits: 'tote bag, t-shirt, gourde, mug, parapluie, carnet',
    exigeVectoriel: true,
    monochrome: false,
    supporteDegrade: false,
  },
  {
    cle: 'tampographie',
    nom: 'Tampographie',
    guide: '/guide/tampographie',
    definition: 'Un tampon de silicone dépose l\'encre, y compris sur les surfaces courbes.',
    produits: 'stylo, briquet, clé USB, gourde, powerbank, porte-clés',
    exigeVectoriel: true,
    monochrome: false,
    supporteDegrade: false,
  },
  {
    cle: 'gravure_laser',
    nom: 'Gravure laser',
    guide: '/guide/gravure-laser',
    definition: 'Le laser retire la matière : pas d\'encre, une seule teinte, celle du support gravé.',
    produits: 'gourde inox, stylo métal, carnet, objet en bois, cuir, porte-clés',
    exigeVectoriel: true,
    monochrome: true,
    supporteDegrade: false,
  },
  {
    cle: 'broderie',
    nom: 'Broderie',
    guide: '/guide/broderie',
    definition: 'Le dessin est cousu fil par fil : chaque couleur est une bobine.',
    // LA SEULE RESERVE PERMANENTE DE LA GRILLE, arbitrage Alex du 26/08/2026.
    //
    // Elle ne depend d'aucune mesure et d'aucun seuil : elle est vraie de TOUS
    // les logos brodes, y compris ceux qui obtiennent un vert. C'est pour cela
    // qu'elle n'est pas un feu. Un feu repond a « puis-je envoyer ce fichier
    // tel quel », et en broderie la reponse reste oui : l'atelier redessine le
    // logo en points de couture, c'est son metier. Ce qui doit se savoir avant
    // de commander, c'est que le resultat ne sera pas la meme image.
    //
    // Aucune autre technique n'en porte, et c'est voulu. Une reserve sur
    // chaque ligne serait un bandeau d'avertissement, donc plus rien.
    reserve: 'Le rendu ne peut pas être fidèle au dessin : un atelier reconstruit '
      + 'le logo en points de couture. Les détails fins se referment, le petit texte '
      + 'se comble, et les couleurs sont celles des fils disponibles.',
    produits: 'casquette, polo, sweat, serviette, sac en toile, bonnet',
    exigeVectoriel: true,
    monochrome: false,
    supporteDegrade: false,
  },
  {
    cle: 'marquage_a_chaud',
    nom: 'Marquage à chaud',
    guide: '/guide/marquage-a-chaud',
    definition: 'Une matrice chaude presse une feuille métallisée : une pose, une teinte.',
    produits: 'carnet, agenda, cuir, trousse, étui, sous-main',
    exigeVectoriel: true,
    monochrome: true,
    supporteDegrade: false,
  },
]);

/**
 * LE PLUS PETIT MARQUAGE COURANT, en millimetres.
 *
 * Il sert a une seule chose : savoir si une image est trop peu definie POUR
 * QUELQUE CHOSE. Sans taille de reference, la definition ne se juge pas.
 *
 * Ce n'est pas un seuil de marquage au sens du referentiel, c'est un plancher
 * d'usage : sous cinquante millimetres, on est deja dans le marquage de stylo,
 * et une image qui n'atteint meme pas ca a 150 dpi ne sert nulle part. La
 * valeur reste a reprendre en ARBITRÉ ALEX ; le harnais la nomme pour qu'elle
 * ne se perde pas dans le code.
 */
export const MARQUAGE_COURANT_MM = 50;

/**
 * LES CAUSES DE ROUGE, et chacune a son propre texte.
 *
 * « Il faut une version adaptée » ne sert a rien : la personne va devoir
 * briefer un prestataire et elle ne sait pas quoi demander. C'est la que se
 * trouve la valeur du bloc : LE SITE ECRIT LE BRIEF DU GRAPHISTE A SA PLACE.
 *
 * Six causes etaient prevues. TROIS SONT MUETTES AUJOURD'HUI, et c'est une
 * decision de doctrine, pas un oubli : R3 le trait trop fin, R4 l'ecart trop
 * etroit et R5 le texte trop petit demandent tous les trois un seuil de
 * marquage que le referentiel n'a pas encore arbitre (P0.7 : vingt-trois
 * valeurs sourcees de 0,13 a 1,00 mm ne deviennent pas un chiffre toutes
 * seules). Le moteur MESURE ces trois grandeurs depuis longtemps ; il les
 * dira le jour ou le seuil existera. Un seuil invente se recopie longtemps.
 */
export const CAUSES = Object.freeze({
  couleurs: 'couleurs',
  monochrome: 'monochrome',
  degrade: 'degrade',
});

/** Le nombre de couleurs a-t-il un plafond qui SERT sur cette technique ? */
function plafondQuiSert(seuils, cle) {
  const critere = seuils?.techniques?.[cle]?.criteres?.couleurs;
  // Doctrine des etats : SOURCÉ et ARBITRÉ ALEX servent un verdict, AGRÉGAT et
  // INFÉRÉ ne le servent jamais. Un plafond de couleurs observe chez un
  // grossiste n'est pas un plafond d'atelier.
  if (!critere || !Number.isFinite(critere.valeur)) return null;
  const sert = critere.etat === 'SOURCÉ' || critere.etat === 'ARBITRÉ ALEX';
  return sert ? critere.valeur : null;
}

/**
 * LA TAILLE COURANTE D'UN MARQUAGE dans cette technique, en millimetres.
 *
 * Elle se lit dans les archetypes, qui portent les zones reelles ou chaque
 * technique est proposee : c'est la mediane de leurs largeurs. On ne recopie
 * donc aucun chiffre, on lit la meme donnee que le reste du site.
 */
export function tailleCourante(grille, nomsTechnique) {
  const largeurs = [];
  for (const a of grille?.archetypes ?? []) {
    for (const z of a.zones) {
      if (z.techniques.some((t) => nomsTechnique.has(t.technique))) largeurs.push(z.largeurMm);
    }
  }
  if (!largeurs.length) return null;
  largeurs.sort((x, y) => x - y);
  return largeurs[Math.floor(largeurs.length / 2)];
}

/**
 * LES PLAFONDS DE COULEURS DES EMPLACEMENTS ou cette technique est proposee.
 *
 * POURQUOI ON NE LIT PLUS UN CHIFFRE PAR TECHNIQUE, arbitrage Alex du
 * 26/08/2026. seuils.json portait UN plafond par technique, et c'etait
 * contraire a la doctrine du site depuis le premier jour : le plafond
 * appartient a l'EMPLACEMENT, jamais a la technique. Nos propres archetypes le
 * demontrent. Sous le mot « serigraphie » cohabitent des emplacements a une
 * couleur, a quatre, et a huit ; un chiffre unique aurait refuse un six
 * couleurs sur t-shirt, qui est un marquage parfaitement banal, ou laisse
 * passer un six couleurs sur stylo, que personne ne prendra.
 *
 * `couleursMax` vaut null pour la quadrichromie : un seul passage, aucun
 * plafond. Il ne vaut JAMAIS zero, la derivation le traduit une fois pour
 * toutes.
 */
export function plafondsDesEmplacements(grille, nomsTechnique) {
  const plafonds = [];
  for (const a of grille?.archetypes ?? []) {
    for (const z of a.zones) {
      for (const t of z.techniques) {
        if (nomsTechnique.has(t.technique)) {
          plafonds.push(Object.prototype.hasOwnProperty.call(t, 'couleursMax')
            ? t.couleursMax : null);
        }
      }
    }
  }
  return plafonds;
}

/** La regle de realisme, et elle ne sert que si elle est ARBITRÉE. */
function regleDeRealisme(seuils) {
  const r = seuils?.realisme_couleurs;
  if (!r || r.etat !== 'ARBITRÉ ALEX') return null;
  if (!Number.isFinite(r.vert_jusqua) || !Number.isFinite(r.exempt_a_partir_de)) return null;
  return r;
}

/**
 * COMBIEN DE COULEURS CET EMPLACEMENT ACCEPTE SANS QUE LE DEVIS S'ENVOLE.
 *
 * Trois regimes, et ils ne se devinent pas, ils se lisent sur le plafond que
 * l'emplacement declare :
 *   quadrichromie   un seul passage, la couleur suivante ne coute rien ;
 *   plafond eleve   carrousel : les ecrans se montent ensemble, passage unique ;
 *   plafond bas     un ecran, un passage et un calage PAR couleur.
 * Seul le troisieme porte un seuil de realisme.
 */
function realismeDe(plafond, regle) {
  if (plafond === null) return Infinity;
  if (plafond >= regle.exempt_a_partir_de) return plafond;
  return Math.min(regle.vert_jusqua, plafond);
}

/**
 * LE VERDICT COULEUR D'UNE TECHNIQUE, lu sur ses emplacements.
 *
 * Il rend DEUX COMPTES, et c'est volontaire : un seul mot ne sait pas decrire
 * un partage.
 *   `accepte`      combien d'emplacements autorisent ce nombre de couleurs ;
 *   `confortable`  combien l'autorisent SANS que le devis s'envole.
 *
 * Aucun emplacement n'accepte : rouge, et le brief du graphiste s'ecrit.
 * Tous sont confortables : rien a dire, on continue vers le format.
 * Entre les deux : orange, et le texte compose sa phrase avec les deux
 * comptes, parce que « 31 emplacements sur 56 » et « tous, mais chacun demande
 * un ecran de plus » ne disent pas la meme chose au visiteur.
 */
export function jugerCouleursSurEmplacements(plafonds, nCouleurs, regle) {
  if (!regle || !plafonds.length || !Number.isInteger(nCouleurs)) return null;
  let accepte = 0;
  let confortable = 0;
  // Le plus GRAND plafond fini rencontre. Il sert au brief du rouge, qui doit
  // demander la version la moins amputee possible : si un emplacement de la
  // technique monte a quatre, on ne fait pas redessiner le logo pour deux.
  let plafondMax = null;
  for (const p of plafonds) {
    if (p === null) { accepte += 1; confortable += 1; continue; }
    plafondMax = plafondMax === null ? p : Math.max(plafondMax, p);
    if (nCouleurs <= p) {
      accepte += 1;
      if (nCouleurs <= realismeDe(p, regle)) confortable += 1;
    }
  }
  const total = plafonds.length;
  const chiffres = { couleurs: nCouleurs, accepte, confortable, total, plafond: plafondMax };
  if (accepte === 0) return { etat: 'rouge', chiffres };
  if (confortable === total) return null;
  return { etat: 'orange', chiffres };
}

/**
 * Juge UNE technique. Rend le feu, sa raison, et de quoi ecrire le brief.
 *
 * L'ordre des questions n'est pas negociable : le ROUGE d'abord, parce qu'un
 * logo qui doit etre redessine ne sera pas sauve par un fichier vectoriel ; le
 * format ensuite, parce que nous le reglons ; la definition en dernier, parce
 * que c'est au visiteur d'aller chercher son fichier.
 */
export function jugerTechnique(technique, contexte) {
  const { nCouleurs, fichierVectoriel, largeurPx, fusion, degrade, seuils, tailleMm,
          plafonds } = contexte;

  // R1. LE NOMBRE DE COULEURS, LU SUR LES EMPLACEMENTS.
  //
  // Il ne se pose PAS sur les techniques qui ne rendent qu'une teinte : un logo
  // a trois couleurs grave au laser n'est pas un refus, il sort en monochrome,
  // et c'est le cas standard. Ce qui se juge la, c'est la fusion, plus bas.
  const surEmplacements = technique.monochrome
    ? null
    : jugerCouleursSurEmplacements(plafonds ?? [], nCouleurs, regleDeRealisme(seuils));
  if (surEmplacements?.etat === 'rouge') {
    return { feu: 'rouge', cause: CAUSES.couleurs, chiffres: surEmplacements.chiffres };
  }

  // SECOURS, quand la grille des archetypes n'est pas chargee : on retombe sur
  // le chiffre unique de seuils.json, qui ne produit qu'un rouge. Il ne sait
  // pas distinguer les emplacements, donc il ne prononce aucun orange.
  if (!plafonds?.length) {
    const plafond = plafondQuiSert(seuils, technique.cle);
    if (plafond !== null && Number.isInteger(nCouleurs) && nCouleurs > plafond) {
      return { feu: 'rouge', cause: CAUSES.couleurs, chiffres: { couleurs: nCouleurs, plafond } };
    }
  }

  // R2. LE LOGO CASSE EN MONOCHROME. Il ne se pose QUE sur les techniques qui
  // ne rendent qu'une teinte. Un logo a trois couleurs grave au laser n'est pas
  // un rouge par principe : il sort en monochrome, et c'est le cas standard.
  // Le vrai rouge, c'est quand le dessin se referme sur lui-meme.
  if (technique.monochrome && fusion?.fusionne) {
    return { feu: 'rouge', cause: CAUSES.monochrome, chiffres: { part: fusion.partPerdue },
             confusion: fusion.confusion };
  }

  // R6. DEGRADE OU PHOTO, sur les techniques qui ne savent pas faire de
  // demi-teinte. Les numeriques, elles, impriment un degrade sans y penser.
  if (!technique.supporteDegrade && degrade) {
    return { feu: 'rouge', cause: CAUSES.degrade, chiffres: {} };
  }

  // ORANGE A, LE FORMAT. Nous le reglons, gratuitement, ici. C'est le meilleur
  // emplacement possible pour cette conversion : contextualise, merite, jamais
  // impose en haut de page.
  if (technique.exigeVectoriel && fichierVectoriel === false) {
    return { feu: 'orange', nuance: 'format' };
  }

  // ORANGE B, LA DEFINITION. Nous ne pouvons PAS la regler. Et ce n'est pas un
  // rouge : le premier reflexe ne coute rien, chercher un fichier plus grand,
  // et il resout la grande majorite des cas.
  if (fichierVectoriel === false && Number.isFinite(largeurPx) && tailleMm) {
    const dpi = dpiALaTaille(largeurPx, tailleMm);
    if (dpi !== null && dpi < DPI_PLANCHER) {
      return { feu: 'orange', nuance: 'definition', chiffres: { tailleMm, dpi: Math.round(dpi) } };
    }
  }

  // ORANGE C, LE NOMBRE DE COULEURS. Il vient EN DERNIER des trois oranges, et
  // c'est un choix qui se justifie. Personne ne repare rien ici : le fichier
  // est bon, la technique sait faire, et ce sont l'objet puis le devis qui
  // parlent. Les deux oranges precedents, eux, ont une suite immediate : la
  // conversion est gratuite et se fait sur cette page, et chercher un fichier
  // plus grand ne coute rien. Un visiteur qui cumule les deux problemes doit
  // regler le notre d'abord ; celui la l'attendra, il ne bougera pas.
  // « Un obstacle, surmontable » reste exact, et le mot « impossible » ne doit
  // jamais s'en approcher, arbitrage P0.5.
  if (surEmplacements) {
    return { feu: 'orange', nuance: 'couleurs', chiffres: surEmplacements.chiffres };
  }

  return { feu: 'vert' };
}

/**
 * La grille entiere. L'ordre des lignes ne change JAMAIS : c'est une carte du
 * metier, pas un classement de resultats. Un visiteur qui revient doit
 * retrouver la sérigraphie a la meme place.
 */
export function jugerFeux(contexte, grille = null) {
  return TECHNIQUES_FEUX.map((technique) => {
    const noms = new Set((contexte.nomsParFamille?.[technique.cle]) ?? []);
    const tailleMm = grille && noms.size ? tailleCourante(grille, noms) : MARQUAGE_COURANT_MM;
    // Les plafonds viennent de la MEME lecture que les tailles de zone : une
    // seule source de donnees pour toute la page, et elle est deja publique.
    const plafonds = grille && noms.size ? plafondsDesEmplacements(grille, noms) : [];
    return {
      ...technique,
      ...jugerTechnique(technique, {
        ...contexte, plafonds, tailleMm: tailleMm ?? MARQUAGE_COURANT_MM }),
    };
  });
}

/** Combien de feux de chaque couleur. Sert au resume et au harnais. */
export function compterFeux(feux) {
  return {
    vert: feux.filter((f) => f.feu === 'vert').length,
    orange: feux.filter((f) => f.feu === 'orange').length,
    rouge: feux.filter((f) => f.feu === 'rouge').length,
    total: feux.length,
  };
}
