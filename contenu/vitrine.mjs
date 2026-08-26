/**
 * LA VITRINE DE L'ACCUEIL : trois objets, une seule source.
 *
 * POURQUOI CES IMAGES NE SONT PAS DES MAQUETTES. Elles sont composees par les
 * memes modules que la page /voir-mon-logo, sur les memes photos derivees, a
 * la meme echelle en millimetres. Une illustration dessinee a cote
 * promettrait quelque chose que le produit ne tient pas forcement ; celle-ci
 * ne peut pas mentir plus que l'outil. Le jour ou le moteur change, elles se
 * regenerent au lieu de vieillir en silence.
 *
 * ET LE §8 DU MASTER PROMPT TIENT QUAND MEME. Un ecran qui montre un logo sur
 * un objet ne sert jamais de preuve de marquabilite. La legende porte la
 * distinction en clair, sous les images, et un controle refuse la page si
 * elle disparait.
 *
 * LE LOGO EST LE NOTRE, arbitrage Alex du 25/08. Le corpus de logos clients
 * ne sort jamais du dossier de travail, et une marque inventee qui
 * ressemblerait a une vraie serait un faux.
 *
 * LES TAILLES SONT ARBITREES, pas prises au defaut. Le simulateur pose a 70 %
 * de la zone faute de preference, ce qui donnerait 210 mm de logo sur un tote
 * bag : vrai, et sans l'air d'etre vrai. Une vitrine doit ressembler a ce
 * qu'un acheteur commande, pas a ce que la zone permet.
 *
 * DEUX ENCRES, et c'est une information, pas une coquetterie. Un objet fonce
 * appelle une version claire du logo. Le carnet le montre.
 *
 * CE QUI A ETE ECARTE, et pourquoi, pour que personne ne le repropose :
 *
 * - la planche a decouper, plus jolie, mais le lot ne lui accorde que la
 *   gravure laser, `couleursMax` a 1. Un logo deux couleurs pose dessus
 *   serait une image FAUSSE, et c'est le genre d'image qu'un professionnel
 *   repere en une seconde.
 * - le polo, dont la vue poitrine du lot est le polo bleu roi : notre navy y
 *   est illisible. Le t-shirt blanc porte la meme vue.
 * - le t-shirt rouge p02_03 et le tapis noir p07_28, qui portent une mention
 *   du flux fournisseur cuite dans l'image.
 */

/*
 * LES OBJETS SONT A LEUR TAILLE RELATIVE REELLE, arbitrage Alex du 26/08.
 *
 * La premiere version rendait les trois photos a la MEME largeur de tuile. Un
 * carnet A5 y paraissait aussi grand qu'un t-shirt. Sur un site dont toute la
 * doctrine dit que le millimetre est la verite, c'est une image fausse, et
 * c'est celle qu'un acheteur voit en premier.
 *
 * Les millimetres ci-dessous ne sont pas estimes : ils se deduisent du lot.
 * Chaque vue porte les dimensions de sa zone en mm et en pixels, donc une
 * echelle, donc la taille reelle de la photo entiere. Le composeur recalcule
 * ces valeurs a chaque passage et refuse celles qui ne correspondent plus.
 *
 * Controle de vraisemblance, fait a la main une fois : le rapport carnet sur
 * t-shirt sort a 0,32. Un carnet A5 mesure 210 mm, un t-shirt a plat environ
 * 700, soit 0,30. La derivation dit donc la meme chose que le metre.
 */
export const VITRINE = [
  {
    image: 'p01_01.jpg', part: 0.58, encre: 'navy',
    largeurPx: 700, hauteurPx: 882,
    largeurMmPhoto: 495, hauteurMmPhoto: 623,
    alt: 'Le logo Bon à Marquer imprimé sur le devant d\'un tote bag en coton écru, '
       + 'à 174 millimètres de large.',
  },
  {
    image: 'p02_05.jpg', part: 0.92, encre: 'navy',
    largeurPx: 700, hauteurPx: 708,
    largeurMmPhoto: 727, hauteurMmPhoto: 736,
    alt: 'Le même logo en marquage poitrine sur un t-shirt blanc, à 92 millimètres de large.',
  },
  {
    // LE DOS PLUTOT QUE LE DEVANT, arbitrage Alex du 26/08/2026 : « le carnet est
    // trop petit, ce n'est pas parlant ». La taille du carnet, elle, ne se
    // negocie pas, c'est celle d'un A5 a cote d'un t-shirt. Ce qui se negocie,
    // c'est l'EMPLACEMENT : le devant en haut n'offre que 80 x 70 mm, soit la
    // moitie de la largeur de la couverture, quand le dos en offre 110 x 180,
    // soit soixante-dix pour cent. Le marquage y est donc nettement plus grand
    // sans qu'aucune echelle ait bouge, et la surface y est unie, sans la
    // poche diagonale ni le passant du devant.
    image: 'p04_16.jpg', part: 0.80, encre: 'blanc',
    largeurPx: 663, hauteurPx: 999,
    largeurMmPhoto: 156, hauteurMmPhoto: 235,
    alt: 'Le logo dans sa version blanche sur le dos d\'un carnet A5 à couverture souple, '
       + 'à 88 millimètres de large.',
  },
];

/**
 * LA LEGENDE, et elle n'est pas decorative.
 *
 * Master prompt §8 : un ecran de simulation ne sert JAMAIS de preuve de
 * marquabilite. Cette phrase peut disparaitre d'une relecture sans que rien
 * ne casse, et c'est exactement pour ca qu'un controle la garde.
 */
export const LEGENDE = 'Ces trois images sont produites par cet outil, sur des zones aux '
  + 'dimensions déclarées par les fabricants, et les objets sont à leur taille relative '
  + 'réelle. C\'est une simulation, pas une validation.';

/**
 * LA PART DE HAUTEUR DE CHAQUE OBJET, entre 0 et 1, le plus grand valant 1.
 *
 * C'est la seule chose que la feuille de style a besoin de savoir : elle
 * multiplie une hauteur de reference par cette part. Le rapport largeur sur
 * hauteur, lui, vient de l'image elle-meme, donc il ne peut pas se tromper.
 */
export function partsDeHauteur() {
  const plusGrand = Math.max(...VITRINE.map((v) => v.hauteurMmPhoto));
  return new Map(VITRINE.map((v) => [v.image, v.hauteurMmPhoto / plusGrand]));
}
