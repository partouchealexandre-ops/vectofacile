/**
 * Le contenu des pages, en donnees.
 *
 * Une page n'est pas un fichier HTML ecrit a la main : c'est un objet, rendu
 * par un gabarit unique. Il y a une raison de fond, pas de confort. Le site
 * doit atteindre cinquante a quatre vingts URL, et chaque changement de
 * navigation, de pied de page ou de balisage devra s'appliquer a toutes. Une
 * page ecrite a la main est une page qu'on oubliera de mettre a jour.
 *
 * REGLE DU PROJET, non negociable : aucune page ne nait vide. Chaque entree
 * ici porte au moins un tableau de donnees unique ou une reponse mesuree. On ne
 * genere pas de coquilles pour faire du volume : le contenu mince coute en
 * referencement et ne rapporte rien la ou seuls les faits se citent.
 *
 * DEUXIEME REGLE, ajoutee le 19/08 : la navigation ne montre que des pages
 * publiees. Un lien d'entete vers une 404 est la faute la plus visible qu'un
 * site puisse commettre, et c'est exactement ce qui arrive quand on cable la
 * navigation cible avant d'avoir ecrit les pages. Les rubriques prevues mais
 * non publiables vivent dans EN_ATTENTE, avec la raison qui les bloque, et la
 * construction refuse tout lien vers une URL qui n'est ni publiee ni declaree
 * ici.
 */

export const RUBRIQUES = [
  // En tete de liste depuis le 25/08 : c'est la rubrique qu'un visiteur vient
  // chercher sans savoir qu'elle existe, et la seule que personne d'autre ne
  // propose. Les deux suivantes se cherchent, celle-ci se decouvre.
  { titre: 'Votre logo sur un objet', url: '/voir-mon-logo' },
  { titre: 'Techniques de marquage', url: '/guide/' },
  { titre: 'Questions fréquentes', url: '/questions/' },
];

/*
 * POURQUOI « VOTRE LOGO RESTE CHEZ VOUS » A QUITTE CETTE LISTE, arbitrage
 * Alex du 25/08/2026, sur mesure et pas sur gout.
 *
 * A quatre rubriques, l'entete passait de 79 a 135 pixels et se cassait sur
 * deux lignes, a 1280 comme a 1440. Ce n'etait pas la longueur du libelle :
 * meme « Sur un objet », douze caracteres, debordait. C'est le nombre
 * d'elements qui ne tient pas dans le cadre de 1120 px a cote du logotype et
 * des deux actions.
 *
 * La promesse de confidentialite ne disparait pas pour autant : elle reste
 * dans le PIED ci-dessous, dans l'accroche de l'accueil, et sur sa propre
 * page. Des quatre rubriques, c'est celle qui repondait a une inquietude
 * plutot qu'a un besoin, et celle qu'on cherche le moins.
 */

/**
 * Les rubriques validees avec Alex mais pas encore publiables, et POURQUOI.
 * Elles reprendront leur place dans RUBRIQUES le jour ou leurs pages existent.
 */
export const EN_ATTENTE = [
  {
    titre: 'Marquage par objet',
    url: '/marquage/',
    raison: "Les croisements objet sont bloques par P0.4 : tant que plat et rotatif ne sont "
      + "pas distingues, publier une taille maximale pour un mug publierait une erreur sur "
      + "la famille d'objets la plus demandee.",
  },
];

/**
 * `/guide/` a quitte cette liste le 19/08. Le raisonnement qui l'y avait mise
 * etait incomplet : il supposait qu'une fiche technique ne vaut que par ses
 * chiffres. Ce qui decide d'un marquage tient d'abord a une mecanique physique,
 * et celle-la se decrit sans seuil. Les fiches sont publiees en forme honnete,
 * et elles s'enrichiront des chiffres a URL constante.
 */

export const PIED = [
  {
    titre: "L'outil",
    liens: [
      { titre: 'Diagnostiquer un logo', url: '/' },
      { titre: 'Votre logo sur un objet', url: '/voir-mon-logo' },
      { titre: 'Votre logo reste chez vous', url: '/confidentialite' },
    ],
  },
  {
    titre: 'Techniques de marquage',
    liens: [
      { titre: 'La sérigraphie', url: '/guide/serigraphie' },
      { titre: 'La gravure laser', url: '/guide/gravure-laser' },
      { titre: 'La tampographie', url: '/guide/tampographie' },
    ],
  },
  {
    titre: 'Questions fréquentes',
    liens: [
      { titre: 'Mon imprimeur demande un fichier vectoriel', url: '/questions/mon-imprimeur-demande-un-fichier-vectoriel' },
      { titre: 'Comment vectoriser un JPEG', url: '/questions/comment-vectoriser-un-jpeg' },
      { titre: 'Combien de couleurs a vraiment mon logo', url: '/questions/combien-de-couleurs-a-mon-logo' },
    ],
  },
  {
    titre: 'Bon à Marquer',
    liens: [
      { titre: 'Une initiative Bytouch', url: '/qui-sommes-nous' },
      { titre: 'Mentions légales', url: '/mentions-legales' },
    ],
  },
];
