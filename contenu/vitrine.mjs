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
 * LA TAILLE RELATIVE REELLE EST ABANDONNEE, arbitrage Alex du 31/08, qui
 * renverse celui du 26/08. Il faut dire pourquoi, parce que l'arbitrage
 * precedent n'etait pas faux.
 *
 * CE QU'IL DISAIT. Rendre les trois photos a la meme hauteur ferait paraitre
 * un carnet A5 aussi grand qu'un t-shirt. Sur un site dont toute la doctrine
 * dit que le millimetre est la verite, c'est une image fausse.
 *
 * CE QU'IL COUTAIT, et qu'on a mis cinq jours a voir. Le rapport reel du
 * carnet au t-shirt vaut 0,32. Aucune mise en page ne rend harmonieuse une
 * rangee ou un objet vaut le quart d'un autre : il y aura toujours un grand
 * vide et un petit objet perdu dans un coin. Trois traitements successifs ont
 * ete essayes, filet, carte, bande pleine largeur, et aucun n'y pouvait rien,
 * parce que le defaut n'etait pas dans la mise en page.
 *
 * ET SON BENEFICE ETAIT INVISIBLE. Rien a l'ecran ne dit qu'une echelle est
 * respectee ; il faut lire trois lignes de legende pour l'apprendre. C'etait
 * une exactitude que personne ne percoit, payee par la seule image de la page
 * d'accueil.
 *
 * OU L'ECHELLE REELLE RESTE, ET C'EST L'ESSENTIEL. Dans le simulateur, ou le
 * visiteur choisit son objet, pose son logo et lit ses millimetres. La, elle
 * est le produit. Sur une vitrine d'accueil, c'etait du zele.
 *
 * La legende perd donc la phrase sur la taille relative, qui deviendrait
 * fausse, et garde la seule qui engage : simulation, pas validation.
 *
 * Doctrine : une exactitude que personne ne peut percevoir n'est pas une
 * exactitude, c'est une contrainte.
 */
export const VITRINE = [
  {
    image: 'p01_01.jpg', part: 0.58, encre: 'navy', hauteurVue: 1,
    largeurPx: 700, hauteurPx: 882,
    largeurMmPhoto: 495, hauteurMmPhoto: 623,
    alt: 'Le logo Bon à Marquer imprimé sur le devant d\'un tote bag en coton écru, '
       + 'à 174 millimètres de large.',
  },
  {
    image: 'p02_05.jpg', part: 0.92, encre: 'navy', hauteurVue: 1,
    largeurPx: 700, hauteurPx: 708,
    largeurMmPhoto: 727, hauteurMmPhoto: 736,
    alt: 'Le même logo en marquage poitrine sur un t-shirt blanc, à 92 millimètres de large.',
  },
  {
    // LE DEVANT PLUTOT QUE LE DOS, arbitrage Alex du 31/08, qui renverse celui
    // du 26/08. La raison est metier et elle prime sur la geometrie : un carnet
    // se marque sur sa premiere de couverture, c'est la que l'acheteur attend
    // son logo, et une vitrine doit ressembler a ce qu'on commande.
    //
    // CE QUE CA COUTE, mesure. La zone du devant en haut fait 80 x 70 mm quand
    // le dos en offrait 110 x 180. Le marquage maximal passe donc de 110 a
    // 80 mm. La part monte a 0,95 pour compenser : le logo fait 76 mm sur une
    // couverture de 154, soit 49 % de sa largeur, contre 56 % au dos. L'ecart
    // se voit a peine, et il est du bon cote de la verite : sur ce carnet, on
    // ne peut pas marquer plus large que 80 mm.
    //
    // CE QUI VIENT AVEC. La premiere de couverture porte une poche diagonale et
    // un passant elastique, la ou le dos etait uni. C'est moins propre en
    // geometrie et plus vrai en usage.
    //
    // L'ENCRE RESTE BLANCHE, et ce n'est plus seulement une preference : cette
    // couverture est navy, exactement notre navy. Le logo en encre de marque y
    // serait illisible.
    image: 'p04_13.jpg', part: 0.95, encre: 'blanc', hauteurVue: 0.70,
    largeurPx: 659, hauteurPx: 1000,
    largeurMmPhoto: 154, hauteurMmPhoto: 234,
    alt: 'Le logo dans sa version blanche sur la première de couverture d\'un carnet A5 '
       + 'à couverture souple, à 76 millimètres de large.',
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

/**
 * LA PART DE HAUTEUR DE CHAQUE OBJET A L'ECRAN, entre 0 et 1.
 *
 * Elle etait DERIVEE des millimetres jusqu'au 31/08 : le carnet y valait 0,32
 * du t-shirt, sa vraie proportion, et c'est ce qui rendait la rangee
 * impossible a composer. Elle est desormais ARBITREE, comme dans n'importe
 * quel catalogue, et le fichier le dit au lieu de le cacher.
 *
 * Les deux textiles occupent la hauteur pleine. Le carnet est pose a 0,70 :
 * assez petit pour qu'on lise que ce n'est pas un textile, assez grand pour
 * que son marquage se voie. Ce nombre est un reglage d'oeil, il se change sans
 * rien casser, et c'est exactement pour ca qu'il vit ici et pas dans le CSS.
 *
 * Le rapport largeur sur hauteur, lui, continue de venir de l'image elle-meme :
 * un objet n'est jamais deforme, il est seulement mis a une autre echelle que
 * son voisin.
 */
export function partsDeHauteur() {
  return new Map(VITRINE.map((v) => [v.image, v.hauteurVue ?? 1]));
}
