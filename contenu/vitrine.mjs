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

export const VITRINE = [
  {
    image: 'p01_01.jpg', part: 0.58, encre: 'navy',
    largeurPx: 700, hauteurPx: 882,
    alt: 'Le logo Bon à Marquer imprimé sur le devant d\'un tote bag en coton écru, '
       + 'à 174 millimètres de large.',
  },
  {
    image: 'p02_05.jpg', part: 0.85, encre: 'navy',
    largeurPx: 700, hauteurPx: 708,
    alt: 'Le même logo en marquage poitrine sur un t-shirt blanc, à 85 millimètres de large.',
  },
  {
    image: 'p04_13.jpg', part: 0.80, encre: 'blanc',
    largeurPx: 659, hauteurPx: 1000,
    alt: 'Le logo dans sa version blanche sur la couverture bleu marine d\'un carnet A5, '
       + 'à 64 millimètres de large.',
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
  + 'dimensions déclarées par les fabricants. C\'est une simulation, pas une validation.';
